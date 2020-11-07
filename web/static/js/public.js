var aceEditor = {
	layer_view:'', 
	aceConfig:{},  //ace配置参数
	editor: null,
	pathAarry:[],
	editorLength: 0,
	isAceView:true,
	ace_active:'',
	is_resizing:false,
	menu_path:'', //当前文件目录根地址
	refresh_config:{
		el:{}, // 需要重新获取的元素,为DOM对象
		path:'',// 需要获取的路径文件信息
		group:1,// 当前列表层级，用来css固定结构
		is_empty:true
	}, //刷新配置参数
	// 新建空白文件
	create_file_req:function(obj,callback){
		var loadT = layer.msg('正在新建文件，请稍后...',{time: 0,icon: 16,shade: [0.3, '#000']});
		$.post("/files?action=CreateFile",{
			path:obj.path
		},function(res){
			layer.close(loadT);
			if(callback) callback(res);
		});
	},
	// 新建目录
	create_dir_req:function(obj,callback){
		var loadT = layer.msg('正在新建目录，请稍后...',{time: 0,icon: 16,shade: [0.3, '#000']});
		$.post("/files?action=CreateDir",{
			path:obj.path
		},function(res){
			layer.close(loadT);
			if(callback) callback(res);
		});
	},
	// 删除文件
	del_file_req:function(obj,callback){
		var loadT = layer.msg('正在删除文件，请稍后...',{time: 0,icon: 16,shade: [0.3, '#000']});
		$.post("/files?action=DeleteFile",{
			path:obj.path
		},function(res){
			layer.close(loadT);
			if(callback) callback(res);
		});
	},
	// 删除目录
	del_dir_req:function(obj,callback){
		var loadT = layer.msg('正在删除文件目录，请稍后...',{time: 0,icon: 16,shade: [0.3, '#000']});
		$.post("/files?action=DeleteDir",{
			path:obj.path
		},function(res){
			layer.close(loadT);
			if(callback) callback(res);
		});
	},
	// 重命名和剪切粘贴
	rename_currency_req:function(obj,callback){
		var loadT = layer.msg('正在重命名文件或目录，请稍后...',{time: 0,icon: 16,shade: [0.3, '#000']});
		$.post("/files?action=MvFile",{
			sfile:obj.sfile,
			dfile:obj.dfile,
			rename:'true'
		},function(res){
			layer.close(loadT);
			if(callback) callback(res);
		});
	},	
	// 事件编辑器-方法，事件绑定
	eventEditor: function () {
		var _this = this,_icon = '<span class="icon"><i class="glyphicon glyphicon-ok" aria-hidden="true"></i></span>';
		$(window).resize(function(){
			if(_this.ace_active != undefined) _this.setEditorView()
			if( $('.aceEditors .layui-layer-maxmin').length >0){
            	$('.aceEditors').css({
                	'top':0,
                	'left':0,
                	'width':$(this)[0].innerWidth,
                	'height':$(this)[0].innerHeight
                });
            }
		})
		$(document).click(function(e){
			$('.ace_toolbar_menu').hide();
			$('.ace_conter_editor .ace_editors').css('fontSize', _this.aceConfig.aceEditor.fontSize + 'px');
			$('.ace_toolbar_menu .menu-tabs,.ace_toolbar_menu .menu-encoding,.ace_toolbar_menu .menu-files').hide();
		});
		$('.ace_editor_main').on('click',function(){
            $('.ace_toolbar_menu').hide();
        });
		$('.ace_toolbar_menu').click(function(e){
			e.stopPropagation();
			e.preventDefault();
		});
		// 显示工具条
		$('.ace_header .pull-down').click(function(){
			if($(this).find('i').hasClass('glyphicon-menu-down')){
                $('.ace_header').css({'top':'-35px'});
                $('.ace_overall').css({'top':'0'});
                $(this).css({'top':'35px','height':'40px','line-height':'40px'});
				$(this).find('i').addClass('glyphicon-menu-up').removeClass('glyphicon-menu-down');
			}else{
				$('.ace_header').css({'top':'0'});
                $('.ace_overall').css({'top':'35px'});
                $(this).removeAttr('style');
				$(this).find('i').addClass('glyphicon-menu-down').removeClass('glyphicon-menu-up');
			}
			_this.setEditorView();
		});
		// 切换TAB视图
		$('.ace_conter_menu').on('click', '.item', function (e) {
			var _id = $(this).attr('data-id'),_item = _this.editor[_id]
			$('.item_tab_'+ _id).addClass('active').siblings().removeClass('active');
			$('#ace_editor_'+ _id).addClass('active').siblings().removeClass('active');
			_this.ace_active = _id;
			_this.currentStatusBar(_id);
		});
		// 移上TAB按钮变化，仅文件被修改后
		$('.ace_conter_menu').on('mouseover', '.item .icon-tool', function () {
			var type = $(this).attr('data-file-state');
			if (type != '0') {
				$(this).removeClass('glyphicon-exclamation-sign').addClass('glyphicon-remove');
			}
		});
		// 移出tab按钮变化，仅文件被修改后
		$('.ace_conter_menu').on('mouseout', '.item .icon-tool', function () {
			var type = $(this).attr('data-file-state');
			if (type != '0') {
				$(this).removeClass('glyphicon-remove').addClass('glyphicon-exclamation-sign');
			}
		});
		// 关闭编辑视图
		$('.ace_conter_menu').on('click', '.item .icon-tool', function (e) {
			var file_type = $(this).attr('data-file-state');
			var file_title = $(this).attr('data-title');
			var _id = $(this).parent().parent().attr('data-id');
			switch (file_type) {
				// 直接关闭
				case '0':
					_this.removeEditor(_id);
				break;
					// 未保存
				case '1':
					var loadT = layer.open({
						type: 1,
						area: ['400px', '180px'],
						title: '提示',
						content: '<div class="ace-clear-form">\
							<div class="clear-icon"></div>\
							<div class="clear-title">是否保存对&nbsp<span class="size_ellipsis" style="max-width:150px;vertical-align: top;" title="' + file_title + '">' + file_title + '</span>&nbsp的更改？</div>\
							<div class="clear-tips">如果不保存，更改会丢失！</div>\
							<div class="ace-clear-btn" style="">\
								<button type="button" class="btn btn-sm btn-default" style="float:left" data-type="2">不保存文件</button>\
								<button type="button" class="btn btn-sm btn-default" style="margin-right:10px;" data-type="1">取消</button>\
								<button type="button" class="btn btn-sm btn-success" data-type="0">保存文件</button>\
							</div>\
						</div>',
						success: function (layers, index) {
							$('.ace-clear-btn .btn').click(function () {
								var _type = $(this).attr('data-type'),
									_item = _this.editor[_id];
								switch (_type) {
									case '0': //保存文件
										_this.saveFileMethod(_item);
									break;
									case '1': //关闭视图
										layer.close(index);
									break;
									case '2': //取消保存
										_this.removeEditor(_id);
										layer.close(index);
									break;
								}
							});
						}
					});
				break;
			}
			$('.ace_toolbar_menu').hide();
			$('.ace_toolbar_menu .menu-tabs,.ace_toolbar_menu .menu-encoding,.ace_toolbar_menu .menu-files').hide();
			e.stopPropagation();
			e.preventDefault();
		});
		$(window).keyup(function(e){
			if(e.keyCode === 116 && $('#ace_conter').length == 1){
				layer.msg('编辑器模式下无法刷新网页，请关闭后重试');
			}
		});
		// 新建编辑器视图
		$('.ace_editor_add').click(function () {
			_this.addEditorView();
		});
		// 底部状态栏功能按钮
		$('.ace_conter_toolbar .pull-right span').click(function (e) {
			var _type = $(this).attr('data-type'),
				_item = _this.editor[_this.ace_active];
			$('.ace_toolbar_menu').show();
			switch (_type) {
				case 'cursor':
					$('.ace_toolbar_menu').hide();
					$('.ace_header .jumpLine').click();
				break;
				case 'tab':
					$('.ace_toolbar_menu .menu-tabs').show().siblings().hide();
					$('.tabsType').find(_item.softTabs?'[data-value="nbsp"]':'[data-value="tabs"]').addClass('active').append(_icon);
					$('.tabsSize [data-value="'+ _item.tabSize +'"]').addClass('active').append(_icon);
				break;
				case 'encoding':
					_this.getEncodingList(_item.encoding);
					$('.ace_toolbar_menu .menu-encoding').show().siblings().hide();
				break;
				case 'lang':
					$('.ace_toolbar_menu').hide();
					layer.msg('暂不支持切换语言模式，敬请期待!',{icon:6});
				break;
			}
			e.stopPropagation();
			e.preventDefault();
		});
		// 隐藏目录
		$('.tips_fold_icon .glyphicon').click(function(){
			if($(this).hasClass('glyphicon-menu-left')){
				$('.ace_conter_tips').css('right','0');
				$('.tips_fold_icon').css('left','0');
				$(this).removeClass('glyphicon-menu-left').addClass('glyphicon-menu-right');
			}else{
				$('.ace_conter_tips').css('right','-100%');
				$('.tips_fold_icon').css('left','-25px');
				$(this).removeClass('glyphicon-menu-right').addClass('glyphicon-menu-left');
			}
		});
		// 设置换行符
		$('.menu-tabs').on('click','li',function(e){
			var _val = $(this).attr('data-value'),_item =  _this.editor[_this.ace_active];
			if($(this).parent().hasClass('tabsType')){
				_item.ace.getSession().setUseSoftTabs(_val == 'nbsp');
				_item.softTabs = _val == 'nbsp';
			}else{
				_item.ace.getSession().setTabSize(_val);
				_item.tabSize = _val;
			}
			$(this).siblings().removeClass('active').find('.icon').remove();
			$(this).addClass('active').append(_icon);
			_this.currentStatusBar(_item.id);
			e.stopPropagation();
			e.preventDefault();
		});
		// 设置编码内容
		$('.menu-encoding').on('click','li',function(e){
			var _item = _this.editor[_this.ace_active];
			layer.msg('设置文件编码：' + $(this).attr('data-value'));
			$('.ace_conter_toolbar [data-type="encoding"]').html('编码：<i>'+ $(this).attr('data-value') +'</i>');
			$(this).addClass('active').append(_icon).siblings().removeClass('active').find('span').remove();
			_item.encoding = $(this).attr('data-value');
			_this.saveFileMethod(_item);
		});
		// 搜索内容键盘事件
		$('.menu-files .menu-input').keyup(function () {
			_this.searchRelevance($(this).val());
			if($(this).val != ''){
				$(this).next().show();
			}else{
				$(this).next().hide();
			}
		});
		// 清除搜索内容事件
		$('.menu-files .menu-conter .fa').click(function(){
			$('.menu-files .menu-input').val('').next().hide();
			_this.searchRelevance();
		});
		// 顶部状态栏
		$('.ace_header>span').click(function (e) {
			var type =  $(this).attr('class'),_item =  _this.editor[_this.ace_active];
			if(_this.ace_active == '' && type != 'helps'){
				return false;
			}
			switch(type){
				case 'saveFile': //保存当时文件
					_this.saveFileMethod(_item);
				break;
				case 'saveFileAll': //保存全部
					var loadT = layer.open({
						type: 1,
						area: ['350px', '180px'],
						title: '提示',
						content: '<div class="ace-clear-form">\
							<div class="clear-icon"></div>\
							<div class="clear-title">是否保存对全部文件的更改？</div>\
							<div class="clear-tips">如果不保存，更改会丢失！</div>\
							<div class="ace-clear-btn" style="">\
								<button type="button" class="btn btn-sm btn-default clear-btn" style="margin-right:10px;" >取消</button>\
								<button type="button" class="btn btn-sm btn-success save-all-btn">保存文件</button>\
							</div>\
						</div>',
						success: function (layers, index) {
							$('.clear-btn').click(function(){
								layer.close(index);
							});
							$('.save-all-btn').click(function(){
								var _arry = [],editor = aceEditor['editor'];
								for(var item in editor){
									_arry.push({
										path: editor[item]['path'],
										data: editor[item]['ace'].getValue(),
										encoding: editor[item]['encoding'],
									})
								}
								_this.saveAllFileBody(_arry,function(){
									$('.ace_conter_menu>.item').each(function (el,index) {
										$(this).find('i').attr('data-file-state','0').removeClass('glyphicon-exclamation-sign').addClass('glyphicon-remove');
										_item.fileType = 0;
									});
									layer.close(index);
								});
							});
						}
					});
				break;
				case 'refreshs': //刷新文件
					if(_item.fileType === 0 ){
						aceEditor.getFileBody({path:_item.path},function(res){
							_item.ace.setValue(res.data);
							_item.fileType = 0;
							$('.item_tab_' + _item.id + ' .icon-tool').attr('data-file-state', '0').removeClass('glyphicon-exclamation-sign').addClass('glyphicon-remove');
							layer.msg('刷新成功',{icon:1});
						});
						return false;
					}
					var loadT = layer.open({
						type: 1,
						area: ['350px', '180px'],
						title: '提示',
						content: '<div class="ace-clear-form">\
							<div class="clear-icon"></div>\
							<div class="clear-title">是否刷新当前文件</div>\
							<div class="clear-tips">刷新当前文件会覆盖当前修改,是否继续！</div>\
							<div class="ace-clear-btn" style="">\
								<button type="button" class="btn btn-sm btn-default clear-btn" style="margin-right:10px;" >取消</button>\
								<button type="button" class="btn btn-sm btn-success save-all-btn">确定</button>\
							</div>\
						</div>',
						success: function (layers, index) {
							$('.clear-btn').click(function(){
								layer.close(index);
							});
							$('.save-all-btn').click(function(){
								aceEditor.getFileBody({path:_item.path},function(res){
									layer.close(index);
									_item.ace.setValue(res.data);
									_item.fileType == 0;
									$('.item_tab_' + _item.id + ' .icon-tool').attr('data-file-state', '0').removeClass('glyphicon-exclamation-sign').addClass('glyphicon-remove');
									layer.msg('刷新成功',{icon:1});
								});
							});
						}
					});
				break;
				// 搜索
				case 'searchs':
					_item.ace.execCommand('find');
				break;
				// 替换
				case 'replaces':
					_item.ace.execCommand('replace');
				break;
				// 跳转行
				case 'jumpLine':
					$('.ace_toolbar_menu').show().find('.menu-jumpLine').show().siblings().hide();
					$('.set_jump_line input').val('').focus();
				    var _cursor = aceEditor.editor[aceEditor.ace_active].ace.selection.getCursor();
				    $('.set_jump_line .jump_tips span:eq(0)').text(_cursor.row);
				    $('.set_jump_line .jump_tips span:eq(1)').text(_cursor.column);
				    $('.set_jump_line .jump_tips span:eq(2)').text(aceEditor.editor[aceEditor.ace_active].ace.session.getLength());
					$('.set_jump_line input').unbind('keyup').on('keyup',function(e){
					    var _val = $(this).val();
						if((e.keyCode >= 48 && e.keyCode <= 57) || (e.keyCode >= 96 && e.keyCode <= 105)){
						    if(_val != '' && typeof parseInt(_val) == 'number'){
						        _item.ace.gotoLine(_val);
						    };
						}
					});
				break;
				// 字体
				case 'fontSize':
					$('.ace_toolbar_menu').show().find('.menu-fontSize').show().siblings().hide();
					$('.menu-fontSize .set_font_size input').val(_this.aceConfig.aceEditor.fontSize).focus();
					$('.menu-fontSize set_font_size input').unbind('keypress onkeydown').on('keypress onkeydown',function (e){
						var _val = $(this).val();
						if(_val == ''){
							$(this).css('border','1px solid red');
							$(this).next('.tips').text('字体设置范围 12-45');
						}else if(!isNaN(_val)){
							$(this).removeAttr('style');
							if(parseInt(_val) > 11 && parseInt(_val) <45){
								$('.ace_conter_editor .ace_editors').css('fontSize', _val+'px')
							}else{
								$('.ace_conter_editor .ace_editors').css('fontSize','13px');
								$(this).css('border','1px solid red');
								$(this).next('.tips').text('字体设置范围 12-45');
							}
						}else{
							$(this).css('border','1px solid red');
							$(this).next('.tips').text('字体设置范围 12-45');
						}
						e.stopPropagation();
						e.preventDefault();
					});
					$('.menu-fontSize .menu-conter .set_font_size input').unbind('change').change(function (){
						var _val = $(this).val();
						$('.ace_conter_editor .ace_editors').css('fontSize',_val+'px');
					});
					$('.set_font_size .btn-save').unbind('click').click(function(){
						var _fontSize = $('.set_font_size input').val();
						_this.aceConfig.aceEditor.fontSize = parseInt(_fontSize);
						_this.saveAceConfig(_this.aceConfig,function(res){
							if(res.status){
								$('.ace_editors').css('fontSize',_fontSize +'px');
								layer.msg('设置成功', {icon: 1});
							}
						});
					}); 
				break;
				//主题
				case 'themes':
					$('.ace_toolbar_menu').show().find('.menu-themes').show().siblings().hide();
					var _html = '',_arry = ['白色主题','黑色主题'];
					for(var i=0;i<_this.aceConfig.themeList.length;i++){
						if(_this.aceConfig.themeList[i] != _this.aceConfig.aceEditor.editorTheme){
							_html += '<li data-value="'+ _this.aceConfig.themeList[i] +'">'+ _this.aceConfig.themeList[i] +'【'+ _arry[i] +'】</li>';
						}else{
							_html += '<li data-value="'+ _this.aceConfig.themeList[i] +'" class="active">'+ _this.aceConfig.themeList[i] +'【'+ _arry[i] +'】'+ _icon +'</li>';
						}
					}
					$('.menu-themes ul').html(_html);
					$('.menu-themes ul li').click(function(){
						var _theme = $(this).attr('data-value');
                        $(this).addClass('active').append(_icon).siblings().removeClass('active').find('.icon').remove();
						_this.aceConfig.aceEditor.editorTheme = _theme;
						_this.saveAceConfig(_this.aceConfig,function(res){
							for(var item in _this.editor){
								_this.editor[item].ace.setTheme("ace/theme/"+_theme);
							}
							layer.msg('设置成功', {icon: 1});
						});
					});
				break;
				case 'setUp':
					$('.ace_toolbar_menu').show().find('.menu-setUp').show().siblings().hide();
					$('.menu-setUp .editor_menu li').each(function(index,el){
						var _type = _this.aceConfig.aceEditor[$(el).attr('data-type')];
						if(_type) $(el).addClass('active').append(_icon);
					})
					$('.menu-setUp .editor_menu li').unbind('click').click(function(){
						var _type = $(this).attr('data-type');
						_this.aceConfig.aceEditor[_type] = !$(this).hasClass('active');
						if($(this).hasClass('active')){
							$(this).removeClass('active').find('.icon').remove();
						}else{
							$(this).addClass('active').append(_icon);
						}
						_this.saveAceConfig(_this.aceConfig,function(res){
							for(var item in _this.editor){
								_this.editor[item].ace.setOption(_type,_this.aceConfig.aceEditor[_type]);
							}
							layer.msg('设置成功', {icon: 1});
						});
					});
				break;
				case 'helps':
					if(!$('[data-type=shortcutKeys]').length != 0){
						_this.addEditorView(1,{title:'快捷键提示',html:aceShortcutKeys.innerHTML});
					}else{
						$('[data-type=shortcutKeys]').click();
					}
				break;
			}
			
			e.stopPropagation();
			e.preventDefault();
		});
		
		// 文件目录选择
		$('.ace_catalogue_list').on('click','.has-children .file_fold',function(e){
			var _layers = $(this).attr('data-layer'),_type = $(this).find('data-type'),_path = $(this).parent().attr('data-menu-path'),_menu = $(this).find('.glyphicon'),_group = parseInt($(this).attr('data-group')),_file = $(this).attr('data-file'),_tath = $(this);
			var _active = $('.ace_catalogue_list .has-children .file_fold.edit_file_group');
			if(_active.length>0 && $(this).attr('data-edit') === undefined){
				switch(_active.attr('data-edit')){
					case '2':
						_active.find('.file_input').siblings().show();
						_active.find('.file_input').remove();
						_active.removeClass('edit_file_group').removeAttr('data-edit');
					break;
					case '1':
					case '0':
						_active.parent().remove();
					break;
				}
				layer.closeAll('tips');
			}
			$('.ace_toolbar_menu').hide();
			$('.ace_toolbar_menu .menu-tabs,.ace_toolbar_menu .menu-encoding,.ace_toolbar_menu .menu-files').hide();
			if($(this).hasClass('edit_file_group')) return false;
			$('.ace_catalogue_list .has-children .file_fold').removeClass('bg');
			$(this).addClass('bg');
			if($(this).attr('data-file') == 'Dir'){
				if(_menu.hasClass('glyphicon-menu-right')){
					_menu.removeClass('glyphicon-menu-right').addClass('glyphicon-menu-down');
					$(this).next().show();
					if($(this).next().find('li').length == 0) _this.reader_file_dir_menu({el:$(this).next(),path:_path,group:_group+1});
				}else{
					_menu.removeClass('glyphicon-menu-down').addClass('glyphicon-menu-right');
					$(this).next().hide();
				}
			}else{
				_this.openEditorView(_path,function(res){
					if(res.status) _tath.addClass('active');
				});
			}
			e.stopPropagation();
			e.preventDefault();
		});
		// 禁用目录选择（文件目录）
		$('.ace_catalogue').bind("selectstart",function(e){
			var omitformtags = ["input", "textarea"];
			omitformtags = "|" + omitformtags.join("|") + "|";
			if (omitformtags.indexOf("|" + e.target.tagName.toLowerCase() + "|") == -1) {
				return false;
			}else{
				return true;
			}
		});
		// 返回目录（文件目录主菜单）
		$('.ace_dir_tools').on('click','.upper_level',function(){
			var _paths = $(this).attr('data-menu-path');
			_this.reader_file_dir_menu({path:_paths,is_empty:true});
			$('.ace_catalogue_title').html('目录：'+ _paths).attr('title',_paths);
		});
		// 新建文件（文件目录主菜单）
		$('.ace_dir_tools').on('click','.new_folder',function(e){
			var _paths = $(this).parent().find('.upper_level').attr('data-menu-path');
			$(this).find('.folder_down_up').show();
			$(document).click(function(){
				$('.folder_down_up').hide();
				$(this).unbind('click');
				return false;
			});
			$('.ace_toolbar_menu').hide();
			$('.ace_catalogue_menu').hide();
			$('.ace_toolbar_menu .menu-tabs,.ace_toolbar_menu .menu-encoding,.ace_toolbar_menu .menu-files').hide();
			e.stopPropagation();
			e.preventDefault();
		});
		// 刷新列表 (文件目录主菜单)
		$('.ace_dir_tools').on('click','.refresh_dir',function(e){
			_this.refresh_config = {
				el:$('.cd-accordion-menu')[0],
				path:$('.ace_catalogue_title').attr('title'),
				group:1,
				is_empty:true
			}
			_this.reader_file_dir_menu(_this.refresh_config,function(){
				layer.msg('刷新成功',{icon:1});
			});
		});
		// 搜索内容 (文件目录主菜单)
		$('.ace_dir_tools').on('click','.search_file',function(e){
			if($(this).parent().find('.search_input_view').length == 0){
				$(this).siblings('div').hide();
				$(this).css('color','#ec4545').attr({'title':'关闭'}).find('.glyphicon').removeClass('glyphicon-search').addClass('glyphicon-remove').next().text("关闭");
				$(this).before('<div class="search_input_title">搜索目录文件</div>');
				$(this).after('<div class="search_input_view">\
					<form>\
                        <input type="text" id="search_input_val" class="ser-text pull-left" placeholder="">\
                        <button type="button" class="ser-sub pull-left"></button>\
                    </form>\
                    <div class="search_boxs">\
                        <input id="search_alls" type="checkbox">\
                        <label for="search_alls"><span>包含子目录文件</span></label>\
                    </div>\
                </div>');
				$('.ace_catalogue_list').css('top','150px');
				$('.ace_dir_tools').css('height','110px');
				$('.cd-accordion-menu').empty();
			}else{
				$(this).siblings('div').show();
				$(this).parent().find('.search_input_view,.search_input_title').remove();
				$(this).removeAttr('style').attr({'title':'搜索内容'}).find('.glyphicon').removeClass('glyphicon-remove').addClass('glyphicon-search').next().text("搜索");
				$('.ace_catalogue_list').removeAttr('style')
				$('.ace_dir_tools').removeAttr('style');
				_this.refresh_config = {
					el:$('.cd-accordion-menu')[0],
					path:$('.ace_catalogue_title').attr('title'),
					group:1,
					is_empty:true
				}
				_this.reader_file_dir_menu(_this.refresh_config);
			}
		});
		
		// 搜索文件内容
		$('.ace_dir_tools').on('click','.search_input_view button',function(e){
			var path = _this.menu_path,
				search = $('#search_input_val').val();
				_this.reader_file_dir_menu({
					el:$('.cd-accordion-menu')[0],
					path:path,
					group:1,
					search:search,
					all:$('#search_alls').is(':checked')?'True':'False',
					is_empty:true
				})
		});
		
		// 当前根目录操作，新建文件或目录
		$('.ace_dir_tools').on('click','.folder_down_up li',function(e){
			var _type = parseInt($(this).attr('data-type'));
			switch(_type){
				case 2:
					_this.newly_file_type_dom($('.cd-accordion-menu'),0,0);
				break;
				case 3:
					_this.newly_file_type_dom($('.cd-accordion-menu'),0,1);
				break;
			}
			_this.refresh_config = {
				el:$('.cd-accordion-menu')[0],
				path:$('.ace_catalogue_title').attr('title'),
				group:1,
				is_empty:true
			}
			$(this).parent().hide();
			$('.ace_toolbar_menu').hide();
			$('.ace_toolbar_menu .menu-tabs,.ace_toolbar_menu .menu-encoding,.ace_toolbar_menu .menu-files').hide();
			e.preventDefault();
			e.stopPropagation();
		});
		// 移动编辑器文件目录
		$('.ace_catalogue_drag_icon .drag_icon_conter').on('mousedown', function (e) {
			var _left = $('.aceEditors')[0].offsetLeft;
			$('.ace_gutter-layer').css('cursor','col-resize');
			$('#ace_conter').unbind().on('mousemove',function(ev){
				var _width = (ev.clientX+1) -_left;
				if(_width >= 265 && _width <= 450){
					$('.ace_catalogue').css({'width':_width,'transition':'none'});
					$('.ace_editor_main').css({'marginLeft':_width,'transition':'none'});
					$('.ace_catalogue_drag_icon ').css('left',_width);
					$('.file_fold .newly_file_input').width($('.file_fold .newly_file_input').parent().parent().parent().width() - ($('.file_fold .newly_file_input').parent().parent().attr('data-group') * 15 -5)-20-30-53);
				}
			}).on('mouseup', function (ev){
				$('.ace_gutter-layer').css('cursor','inherit');
			    $('.ace_catalogue').css('transition','all 500ms');
                $('.ace_editor_main').css('transition','all 500ms');
				$(this).unbind('mouseup mousemove');
			});
		});
		// 收藏目录显示和隐藏
        $('.ace_catalogue_drag_icon .fold_icon_conter').on('click',function (e) {
            if($('.ace_overall').hasClass('active')){
                $('.ace_overall').removeClass('active');
                $('.ace_catalogue').css('left','0');
                $(this).removeClass('active').attr('title','隐藏文件目录');
                $('.ace_editor_main').css('marginLeft',$('.ace_catalogue').width());
            }else{
                $('.ace_overall').addClass('active');
                $('.ace_catalogue').css('left','-'+$('.ace_catalogue').width()+'px');
                $(this).addClass('active').attr('title','显示文件目录');
                $('.ace_editor_main').css('marginLeft',0);
            }
            setTimeout(function(){
            	 if(_this.ace_active != '') _this.editor[_this.ace_active].ace.resize();
            },600);
        });
		// 恢复历史文件
		$('.ace_conter_tips').on('click','a',function(){
			_this.event_ecovery_file(this);
		});
		// 右键菜单
		$('.ace_catalogue_list').on('mousedown','.has-children .file_fold',function(e){
			var x = e.clientX,y = e.clientY,_left = $('.aceEditors')[0].offsetLeft,_top = $('.aceEditors')[0].offsetTop,_that = $('.ace_catalogue_list .has-children .file_fold'),_active =$('.ace_catalogue_list .has-children .file_fold.edit_file_group');
			$('.ace_toolbar_menu').hide();
			if(e.which === 3){
				if($(this).hasClass('edit_file_group')) return false;
				$('.ace_catalogue_menu').css({'display':'block','left':x-_left,'top':y-_top});
				_that.removeClass('bg');
				$(this).addClass('bg');
				_active.attr('data-edit') != '2'?_active.parent().remove():'';
				_that.removeClass('edit_file_group').removeAttr('data-edit');
				_that.find('.file_input').siblings().show();
				_that.find('.file_input').remove();
				$('.ace_catalogue_menu li').show();
				if($(this).attr('data-file') == 'Dir'){
					$('.ace_catalogue_menu li:nth-child(6)').hide();
				}else{
					$('.ace_catalogue_menu li:nth-child(-n+4)').hide();
				}
				$(document).click(function(){
					$('.ace_catalogue_menu').hide();
					$(this).unbind('click');
					return false;
				});
				_this.refresh_config = {
					el:$(this).parent().parent()[0],
					path:_this.get_file_dir($(this).parent().attr('data-menu-path'),1),
					group:parseInt($(this).attr('data-group')),
					is_empty:true
				}
			}
		});
		// 文件目录右键功能
		$('.ace_catalogue_menu li').click(function(e){
			_this.newly_file_type(this);
		});
		// 新建、重命名鼠标事件
		$('.ace_catalogue_list').on('click','.has-children .edit_file_group .glyphicon-ok',function(){
			var _file_or_dir = $(this).parent().find('input').val(),
			_file_type = $(this).parent().parent().attr('data-file'),
			_path = $('.has-children .file_fold.bg').parent().attr('data-menu-path'),
			_type = parseInt($(this).parent().parent().attr('data-edit'));
			if($(this).parent().parent().parent().attr('data-menu-path') === undefined && parseInt($(this).parent().parent().attr('data-group')) === 1){
			    // console.log('根目录')
			    _path = $('.ace_catalogue_title').attr('title');
			}
// 			return false;
			if(_file_or_dir === ''){
				$(this).prev().css('border','1px solid #f34a4a');
				layer.tips(_type===0?'文件目录不能为空':(_type===1?'文件名称不能空':'新名称不能为空'),$(this).prev(),{tips: [1,'#f34a4a'],time:0});
				return false;
			}else if($(this).prev().attr('data-type') == 0){
				return false;
			}
			switch(_type){
				case 0: //新建文件夹
					_this.event_create_dir({ path:_path+'/'+_file_or_dir });
				break;
				case 1: //新建文件
					_this.event_create_file({ path:_path+'/'+_file_or_dir });
				break;
				case 2: //重命名
					_this.event_rename_currency({ sfile:_path,dfile:_this.get_file_dir(_path,1)+'/'+_file_or_dir});
				break;
			}
		});
		// 新建、重命名键盘事件
		$('.ace_catalogue_list').on('keyup','.has-children .edit_file_group input',function(e){
			var _type = $(this).parent().parent().attr('data-edit'),
			_arry = $('.has-children .file_fold.bg+ul>li');
			if(_arry.length == 0 && $(this).parent().parent().attr('data-group') == 1) _arry = $('.cd-accordion-menu>li')
			if(_type != 2){
				for(var i=0;i<_arry.length;i++){
					if($(_arry[i]).find('.file_title span').html() === $(this).val()){
						$(this).css('border','1px solid #f34a4a');
						$(this).attr('data-type',0);
						layer.tips(_type == 0?'文件目录存在同名目录':'文件名称存在同名文件',$(this)[0],{tips: [1,'#f34a4a'],time:0});
						return false
					}
				}
			}
			if(_type == 1 && $(this).val().indexOf('.')) $(this).prev().removeAttr('class').addClass(_this.get_file_suffix($(this).val())+'-icon');
			$(this).attr('data-type',1);
			$(this).css('border','1px solid #528bff');
			layer.closeAll('tips');
			if(e.keyCode === 13) $(this).next().click();
			$('.ace_toolbar_menu').hide();
			$('.ace_toolbar_menu .menu-tabs,.ace_toolbar_menu .menu-encoding,.ace_toolbar_menu .menu-files').hide();
			e.stopPropagation();
			e.preventDefault();
		});
		// 新建、重命名鼠标点击取消事件
		$('.ace_catalogue_list').on('click','.has-children .edit_file_group .glyphicon-remove',function(){
			layer.closeAll('tips');
			if($(this).parent().parent().parent().attr('data-menu-path')){
				$(this).parent().parent().removeClass('edit_file_group').removeAttr('data-edit');
				$(this).parent().siblings().show();
				$(this).parent().remove();
				return false;
			}
			$(this).parent().parent().parent().remove();
		});
		//屏蔽浏览器右键菜单
		$('.ace_catalogue_list')[0].oncontextmenu=function(){
			return false;
		}
		$('.ace_conter_menu').dragsort({
			dragSelector:'.icon_file',
			itemSelector:'li'
		});
		this.setEditorView();
		this.reader_file_dir_menu();
	},
  // 	设置本地存储，设置类型type：session或local
	setStorage:function(type,key,val){
	    if(type != "local" && type != "session")  val = key,key = type,type = 'session';
	    window[type+'Storage'].setItem(key,val);
	},
	//获取指定本地存储，设置类型type：session或local
	getStorage:function(type,key){
	    if(type != "local" && type != "session")  key = type,type = 'session';
	    return window[type+'Storage'].getItem(key);
	},
	//删除指定本地存储，设置类型type：session或local
	removeStorage:function(type,key){
	    if(type != "local" && type != "session")  key = type,type = 'session';
	    window[type+'Storage'].removeItem(key);
	},
    // 	删除指定类型的所有存储信息
	clearStorage:function(type){
	    if(type != "local" && type != "session")  key = type,type = 'session';
	    window[type+'Storage'].clear();
	},
	// 新建文件类型
	newly_file_type:function(that){
		var _type = parseInt($(that).attr('data-type')),
			_active = $('.ace_catalogue .ace_catalogue_list .has-children .file_fold.bg'),
			_group = parseInt(_active.attr('data-group')),
			_path = _active.parent().attr('data-menu-path'), //当前文件夹新建
			_this = this;
			// console.log(_type);
		switch(_type){
			case 0: //刷新目录
				_active.next().empty();
				_this.reader_file_dir_menu({
					el:_active.next(),
					path:_path,
					group:parseInt(_active.attr('data-group')) + 1,
					is_empty:true
				},function(){
					layer.msg('刷新成功',{icon:1});
				});
			break;
			case 1: //打开文件
				_this.menu_path = _path;
				_this.reader_file_dir_menu({
					el:'.cd-accordion-menu',
					path:_this.menu_path,
					group:1,
					is_empty:true
				});
			break;
			case 2: //新建文件
			case 3:
				if(this.get_file_dir(_path,1) != this.menu_path){ //判断当前文件上级是否为显示根目录
					this.reader_file_dir_menu({el:_active,path:_path,group:_group+1},function(res){
						_this.newly_file_type_dom(_active,_group, _type == 2?0:1);
					});
				}else{
					_this.newly_file_type_dom(_active,_group,_type == 2?0:1);
				}
			break;
			case 4: //文件重命名
				var _types = _active.attr('data-file');
				if(_active.hasClass('active')){
					layer.msg('该文件已打开，无法修改名称',{icon:0});
					return false;
				}
				_active.attr('data-edit',2);
				_active.addClass('edit_file_group');
				_active.find('.file_title').hide();
				_active.find('.glyphicon').hide();
				_active.prepend('<span class="file_input"><i class="'+ (_types === 'Dir'?'folder':(_this.get_file_suffix(_active.find('.file_title span').html()))) +'-icon"></i><input type="text" class="newly_file_input" value="'+ (_active.find('.file_title span').html()) +'"><span class="glyphicon glyphicon-ok" aria-hidden="true"></span><span class="glyphicon glyphicon-remove" aria-hidden="true"></span>')
				$('.file_fold .newly_file_input').width($('.file_fold .newly_file_input').parent().parent().parent().width() - ($('.file_fold .newly_file_input').parent().parent().attr('data-group') * 15 -5)-20-30-53);
				$('.file_fold .newly_file_input').focus();
			break;
			case 5:
				GetFileBytes(_path);
			break;
			case 6:
				var is_files =  _active.attr('data-file') === 'Files'
				layer.confirm(lan.get(is_files?'recycle_bin_confirm':'recycle_bin_confirm_dir', [_active.find('.file_title span').html()]), { title: is_files?lan.files.del_file:lan.files.del_dir, closeBtn: 2, icon: 3 }, function (index) {
					_this[is_files?'del_file_req':'del_dir_req']({path:_path},function(res){
						layer.msg(res.msg,{icon:res.status?1:2});
						if(res.status){
							if(_active.attr('data-group') != 1) _active.parent().parent().prev().addClass('bg')
							_this.reader_file_dir_menu(_this.refresh_config,function(){
								layer.msg(res.msg,{icon:1});
							});
						}
					});
				});
			break;
		}
	},
	// 新建文件和文件夹
	newly_file_type_dom:function(_active,_group,_type,_val){
		var _html = '',_this = this,_nextLength = _active.next(':not(.ace_catalogue_menu)').length;
		if(_nextLength > 0){
			_active.next().show();
			_active.find('.glyphicon').removeClass('glyphicon-menu-right').addClass('glyphicon-menu-down');
		}
		_html += '<li class="has-children children_'+ (_group+1) +'"><div class="file_fold edit_file_group group_'+ (_group+1) +'" data-group="'+ (_group+1) +'" data-edit="'+ _type +'"><span class="file_input">';
		_html += '<i class="'+ (_type == 0?'folder':(_type == 1?'text':(_this.get_file_suffix(_val || '')))) +'-icon"></i>'
		_html += '<input type="text" class="newly_file_input" value="'+ (_val != undefined?_val:'') +'">'
		_html += '<span class="glyphicon glyphicon-ok" aria-hidden="true"></span><span class="glyphicon glyphicon-remove" aria-hidden="true"></span></span></div></li>'
		if(_nextLength > 0){
			_active.next().prepend(_html);
		}else{
			_active.prepend(_html);
		}
		setTimeout(function(){
		    $('.newly_file_input').focus()
		},100)
		$('.file_fold .newly_file_input').width($('.file_fold .newly_file_input').parent().parent().parent().width() - ($('.file_fold .newly_file_input').parent().parent().attr('data-group') * 15 -5)-20-30-53);
		return false;
	},
	// 通用重命名事件
	event_rename_currency:function(obj){
		var _active = $('.ace_catalogue_list .has-children .file_fold.edit_file_group'),_this = this;
		this.rename_currency_req({sfile:obj.sfile,dfile:obj.dfile},function(res){
			layer.msg(res.msg,{icon:res.status?1:2});
			if(res.status){
				_this.reader_file_dir_menu(_this.refresh_config,function(){
					layer.msg(res.msg,{icon:1});
				});
			}else{
				_active.find('.file_input').siblings().show();
				_active.find('.file_input').remove();
				_active.removeClass('edit_file_group').removeAttr('data-edit');
			}
		})
	},
	// 创建文件目录事件
	event_create_dir:function(obj){
		var _this = this;
		this.create_dir_req({path:obj.path},function(res){
			layer.msg(res.msg,{icon:res.status?1:2});
			if(res.status){
				_this.reader_file_dir_menu(_this.refresh_config,function(){
					layer.msg(res.msg,{icon:1});
				});
			}
		})
	},
	// 创建文件事件
	event_create_file:function(obj){
		var _this = this;
		this.create_file_req({path:obj.path},function(res){
			layer.msg(res.msg,{icon:res.status?1:2});
			if(res.status){
				_this.reader_file_dir_menu(_this.refresh_config,function(){
					layer.msg(res.msg,{icon:1});
					_this.openEditorView(obj.path);
				});
			}
		})
	},
	// 判断文件是否打开
	is_file_open:function(path,callabck){
		var is_state = false
		for(var i=0;i<this.pathAarry.length;i++){
			if(path === this.pathAarry[i]) is_state = true
		}
		if(callabck){
			callabck(is_state);
		}else{
			return is_state;
		}
	},
	// 获取文件列表
	get_file_dir_list:function(obj,callback){
		var loadT = layer.msg('正在获取文件列表，请稍后...',{time: 0,icon: 16,shade: [0.3, '#000']}),_this = this;
		if(obj['p'] === undefined) obj['p'] = 1;
		if(obj['showRow'] === undefined) obj['showRow'] = 200;
		if(obj['sort'] === undefined) obj['sort'] = 'name';
		if(obj['reverse'] === undefined) obj['reverse'] = 'False';
		if(obj['search'] === undefined) obj['search'] = '';
		if(obj['all'] === undefined) obj['all'] = 'False';
		$.post("/files?action=GetDir&tojs=GetFiles",{p:obj.p,showRow:obj.showRow,sort:obj.sort,reverse:obj.reverse,path:obj.path,search:obj.search}, function(res) {
			layer.close(loadT);
			if(callback) callback(res);
		});
	},
	// 渲染文件列表
	reader_file_dir_menu:function(obj,callback){
		var _path = getCookie('Path'),_this = this;
		if(obj === undefined) obj = {}
		if(obj['el'] === undefined) obj['el'] = '.cd-accordion-menu';
		if(obj['group'] === undefined) obj['group'] = 1;
		if(obj['p'] === undefined) obj['p'] = 1;
		if(obj['path'] === undefined) obj['path'] = _path;
		if(obj['search'] === undefined) obj['search'] = '';
		if(obj['is_empty'] === undefined) obj['is_empty'] = false;
		if(obj['all'] === undefined) obj['all'] = 'False'
		this.get_file_dir_list({p:obj.p,path:obj.path,search:obj.search,all:obj.all},function (res){
			var _dir = res.DIR,_files = res.FILES,_dir_dom = '',_files_dom = '',_html ='';
			_this.menu_path = res.PATH;
			for(var i=0;i<_dir.length;i++){
				var _data = _dir[i].split(';');
				if(_data[0] === '__pycache__') continue;
				_dir_dom += '<li class="has-children children_'+ obj.group +'" title="'+ (obj.path+'/'+_data[0]) +'" data-menu-path="'+ (obj.path+'/'+_data[0])+'" data-size="'+ (_data[1]) +'">\
					<div class="file_fold group_'+ obj.group +'" data-group="'+ obj.group +'" data-file="Dir">\
						<span class="glyphicon glyphicon-menu-right"></span>\
						<span class="file_title"><i class="folder-icon"></i><span>'+ _data[0] +'</span></span>\
					</div>\
					<ul data-group=""></ul>\
					<span class="has_children_separator"></span>\
				</li>';
			}
			for(var j=0;j<_files.length;j++){
				var _data = _files[j].split(';');
				if(_data[0].indexOf('.pyc') !== -1) continue;
				_files_dom += '<li class="has-children" title="'+ (obj.path+'/'+_data[0]) +'" data-menu-path="'+ (obj.path+'/'+_data[0])+'" data-size="'+ (_data[1]) +'" data-suffix="'+ _this.get_file_suffix(_data[0]) +'">\
					<div class="file_fold  group_'+ obj.group +'" data-group="'+ obj.group +'" data-file="Files">\
						<span class="file_title"><i class="'+ _this.get_file_suffix(_data[0]) +'-icon"></i><span>'+ _data[0] +'</span></span>\
					</div>\
				</li>';
			}
			if(res.PATH !== '/' && obj['group'] === 1){
				$('.upper_level').attr('data-menu-path',_this.get_file_dir(res.PATH,1));
				$('.ace_catalogue_title').html('目录：'+ res.PATH).attr('title',res.PATH);
				$('.upper_level').html('<i class="glyphicon glyphicon-share-alt" aria-hidden="true"></i>上一级')
			}else if(res.PATH === '/'){
				$('.upper_level').attr('data-menu-path',_this.get_file_dir(res.PATH,1));
				$('.ace_catalogue_title').html('目录：'+ res.PATH).attr('title',res.PATH);
				$('.upper_level').html('<i class="glyphicon glyphicon-hdd" aria-hidden="true"></i>根目录')
			}
			if(obj.is_empty) $(obj.el).empty();
			$(obj.el).append(_html+_dir_dom+_files_dom);
			if(callback) callback(res);
		});
	},
	// 获取文件目录位置
	get_file_dir:function(path,num){
		var _arry = path.split('/');
		if(path === '/') return '/';
		_arry.splice(-1,num);
		return _arry == ''?'/':_arry.join('/');
	},
	// 获取文件全称
	get_file_suffix:function(fileName){
		var filenames = fileName.match(/\.([0-9A-z]*)$/);
		filenames = (filenames == null?'text':filenames[1]);
		for (var name in this.aceConfig.supportedModes) {
			var data = this.aceConfig.supportedModes[name],suffixs = data[0].split('|'),filename = name.toLowerCase();
			for (var i = 0; i < suffixs.length; i++) {
				if (filenames == suffixs[i]) return filename;
			}
		}
		return 'text';
	},
	// 设置编辑器视图
	setEditorView:function () {
		var aceEditorHeight = $('.aceEditors').height(),_this = this;
		var autoAceHeight = setInterval(function(){
			var page_height = $('.aceEditors').height();
				var ace_conter_menu = $('.ace_conter_menu').height();
				var ace_conter_toolbar = $('.ace_conter_toolbar').height();
				var _height = page_height - ($('.pull-down .glyphicon').hasClass('glyphicon-menu-down')?35:0) - ace_conter_menu - ace_conter_toolbar - 42;
				$('.ace_conter_editor').height(_height);
				if(aceEditorHeight == $('.aceEditors').height()){
					if(_this.ace_active) _this.editor[_this.ace_active].ace.resize();
					clearInterval(autoAceHeight);
				}else {
					aceEditorHeight = $('.aceEditors').height();
				}
		},200);
	},
	// 获取文件编码列表
	getEncodingList: function (type) {
		var _option = '';
		for (var i = 0; i < this.aceConfig.encodingList.length; i++) {
			var item = this.aceConfig.encodingList[i] == type.toUpperCase();
			_option += '<li data- data-value="' + this.aceConfig.encodingList[i] + '" ' + (item ? 'class="active"' : '') + '>' + this.aceConfig.encodingList[i] + (item ?'<span class="icon"><i class="glyphicon glyphicon-ok" aria-hidden="true"></i></span>' : '') + '</li>';
		}
		$('.menu-encoding ul').html(_option);
	},
	// 获取文件关联列表
	getRelevanceList: function (fileName) {
		var _option = '', _top = 0, fileType = this.getFileType(fileName), _set_tops = 0;
		for (var name in this.aceConfig.supportedModes) {
			var data = this.aceConfig.supportedModes[name],item = (name == fileType.name);
			_option += '<li data-height="' + _top + '" data-rule="' + this.aceConfig.supportedModes[name] + '" data-value="' + name + '" ' + (item ? 'class="active"' : '') + '>' + (this.aceConfig.nameOverrides[name] || name) + (item ?'<span class="icon"><i class="glyphicon glyphicon-ok" aria-hidden="true"></i></span>' : '') + '</li>'
			if (item) _set_tops = _top
			_top += 35;
		}
		$('.menu-files ul').html(_option);
		$('.menu-files ul').scrollTop(_set_tops);
	},
	// 搜索文件关联
	searchRelevance: function (search) {
		if(search == undefined) search = '';
		$('.menu-files ul li').each(function (index, el) {
			var val = $(this).attr('data-value').toLowerCase(),
				rule = $(this).attr('data-rule'),
				suffixs = rule.split('|'),
				_suffixs = false;
				search = search.toLowerCase();
			for (var i = 0; i < suffixs.length; i++) {
				if (suffixs[i].indexOf(search) > -1) _suffixs = true 
			}
			if (search == '') {
				$(this).removeAttr('style');
			} else {
				if (val.indexOf(search) == -1) {
					$(this).attr('style', 'display:none');
				} else {
					$(this).removeAttr('style');
				}
				if (_suffixs)  $(this).removeAttr('style')
			}
		});
	},
	// 设置编码类型
	setEncodingType: function (encode) {
		this.getEncodingList('UTF-8');
		$('.menu-encoding ul li').click(function (e) {
			layer.msg('设置文件编码：' + $(this).attr('data-value'));
			$(this).addClass('active').append('<span class="icon"><i class="glyphicon glyphicon-ok" aria-hidden="true"></i></span>').siblings().removeClass('active').find('span').remove();
		});
	},
	// 更新状态栏
	currentStatusBar: function(id){
		var _item = this.editor[id];
		if(_item == undefined){
			this.removerStatusBar();
			return false;
		}
		$('.ace_conter_toolbar [data-type="cursor"]').html('行<i class="cursor-row">1</i>,列<i class="cursor-line">0</i>');
		// $('.ace_conter_toolbar [data-type="history"]').html('历史版本：<i>'+ (_item.historys.length === 0?'无':_item.historys.length+'份') +'</i>');
		$('.ace_conter_toolbar [data-type="path"]').html('文件位置：<i title="'+ _item.path +'">'+ _item.path +'</i>');
		$('.ace_conter_toolbar [data-type="tab"]').html(_item.softTabs?'空格：<i>'+ _item.tabSize +'</i>':'制表符长度：<i>'+ _item.tabSize +'</i>');
		$('.ace_conter_toolbar [data-type="encoding"]').html('编码：<i>'+ _item.encoding.toUpperCase() +'</i>');
		$('.ace_conter_toolbar [data-type="lang"]').html('语言：<i>'+ _item.type +'</i>');
		$('.ace_conter_toolbar span').attr('data-id',id);
		$('.file_fold').removeClass('bg');
		$('[data-menu-path="'+ (_item.path) +'"]').find('.file_fold').addClass('bg');
		if(_item.historys_file){
			$('.ace_conter_toolbar [data-type="history"]').hide();
		}else{
			$('.ace_conter_toolbar [data-type="history"]').show();
		}
		_item.ace.resize();
	},
	// 清除状态栏
	removerStatusBar:function(){
		$('.ace_conter_toolbar [data-type="history"]').html('');
		$('.ace_conter_toolbar [data-type="path"]').html('');
		$('.ace_conter_toolbar [data-type="tab"]').html('');
		$('.ace_conter_toolbar [data-type="cursor"]').html('');
		$('.ace_conter_toolbar [data-type="encoding"]').html('');
		$('.ace_conter_toolbar [data-type="lang"]').html('');
	},
	// 创建ACE编辑器-对象
	creationEditor: function (obj, callabck) {
		var _this = this;
		$('#ace_editor_' + obj.id).text(obj.data || '');
		$('.ace_conter_editor .ace_editors').css('fontSize', _this.fontSize+'px');
		if(this.editor == null) this.editor = {};
		this.editor[obj.id] = {
			ace: ace.edit("ace_editor_" + obj.id, {
				theme: "ace/theme/"+_this.aceConfig.aceEditor.editorTheme, //主题
				mode: "ace/mode/" + (obj.fileName != undefined ? obj.mode : 'text'), // 语言类型
				wrap: _this.aceConfig.aceEditor.wrap,
				showInvisibles:_this.aceConfig.aceEditor.showInvisibles,
				showPrintMargin: false,
				enableBasicAutocompletion: true,
				enableSnippets: _this.aceConfig.aceEditor.enableSnippets,
				enableLiveAutocompletion: _this.aceConfig.aceEditor.enableLiveAutocompletion,
				useSoftTabs:_this.aceConfig.aceEditor.useSoftTabs,
				tabSize:_this.aceConfig.aceEditor.tabSize,
				keyboardHandler:'sublime',
				readOnly:obj.readOnly === undefined?false:obj.readOnly
			}), //ACE编辑器对象
			id: obj.id,
			wrap: _this.aceConfig.aceEditor.wrap, //是否换行
			path:obj.path,
			tabSize:_this.aceConfig.aceEditor.tabSize,
			softTabs:_this.aceConfig.aceEditor.useSoftTabs,
			fileName:obj.fileName,
			enableSnippets: true, //是否代码提示
			encoding: (obj.encoding != undefined ? obj.encoding : 'utf-8'), //编码类型
			mode: (obj.fileName != undefined ? obj.mode : 'text'), //语言类型
			type:obj.type,
            fileType: 0, //文件状态 
			historys: obj.historys,
			historys_file:obj.historys_file === undefined?false:obj.historys_file,
			historys_active:obj.historys_active === ''?false:obj.historys_active
		};
		var ACE = this.editor[obj.id];
		ACE.ace.moveCursorTo(0, 0); //设置鼠标焦点
		ACE.ace.resize(); //设置自适应
		ACE.ace.commands.addCommand({
			name: '保存文件',
			bindKey: {
				win: 'Ctrl-S',
				mac: 'Command-S'
			},
			exec: function (editor) {
				_this.saveFileMethod(ACE);
			},
			readOnly: false // 如果不需要使用只读模式，这里设置false
		});
		ACE.ace.commands.addCommand({
			name: '跳转行',
			bindKey: {
				win: 'Ctrl-I',
				mac: 'Command-I'
			},
			exec: function (editor) {
				$('.ace_header .jumpLine').click();
			},
			readOnly: false // 如果不需要使用只读模式，这里设置false
		})
		// 获取光标位置
		ACE.ace.getSession().selection.on('changeCursor', function(e) {
			var _cursor = ACE.ace.selection.getCursor();
			$('[data-type="cursor"]').html('行<i class="cursor-row">'+ (_cursor.row + 1) +'</i>,列<i class="cursor-line">'+ _cursor.column +'</i>');
		});

		// 触发修改内容
		ACE.ace.getSession().on('change', function (editor) {
			$('.item_tab_' + ACE.id + ' .icon-tool').addClass('glyphicon-exclamation-sign').removeClass('glyphicon-remove').attr('data-file-state', '1');
			ACE.fileType = 1;
			$('.ace_toolbar_menu').hide();
		});
		this.currentStatusBar(ACE.id);
	},
	// 保存文件方法
	saveFileMethod:function(ACE){
		if($('.item_tab_' + ACE.id + ' .icon-tool').attr('data-file-state') == 0){
			layer.msg('当前文件未修改，无需保存!');
			return false;
		}
		$('.item_tab_' + ACE.id + ' .icon-tool').attr('title','保存文件中，请稍后..').removeClass('glyphicon-exclamation-sign').addClass('glyphicon-repeat');
		layer.msg('保存文件中，请稍后<img src="/static/img/ns-loading.gif" style="width:15px;margin-left:5px">',{icon:0});
		this.saveFileBody({
			path: ACE.path,
			data: ACE.ace.getValue(),
			encoding: ACE.encoding
		}, function (res) {
			ACE.fileType = 0;
			$('.item_tab_' + ACE.id + ' .icon-tool').attr('data-file-state','0').removeClass('glyphicon-repeat').addClass('glyphicon-remove');
		},function(res){
			ACE.fileType = 1;
			$('.item_tab_' + ACE.id + ' .icon-tool').attr('data-file-state','1').removeClass('glyphicon-remove').addClass('glyphicon-repeat');
		});
	},
	// 获取文件模型
	getFileType: function (fileName) {
		var filenames = fileName.match(/\.([0-9A-z]*)$/);
		filenames = (filenames == null?'text':filenames[1]);
		for (var name in this.aceConfig.supportedModes) {
			var data = this.aceConfig.supportedModes[name],suffixs = data[0].split('|'),filename = name.toLowerCase();
			for (var i = 0; i < suffixs.length; i++) {
				if (filenames == suffixs[i]){
					return { name: name,mode: filename };
				}
			}
		}
		return {name:'Text',mode:'text'};
	},
	// 新建编辑器视图-方法
	addEditorView: function (type,conifg) {
		if(type == undefined) type = 0
		var _index = this.editorLength,_id = bt.get_random(8);
		$('.ace_conter_menu .item').removeClass('active');
		$('.ace_conter_editor .ace_editors').removeClass('active');
		$('.ace_conter_menu').append('<li class="item active item_tab_'+_id+'" data-type="shortcutKeys" data-id="'+ _id +'" >\
			<div class="ace_item_box">\
				<span class="icon_file"><i class="text-icon"></i></span>\
				<span>'+ (type?conifg.title:('新建文件-'+ _index)) +'</span>\
				<i class="glyphicon icon-tool glyphicon-remove" aria-hidden="true" data-file-state="0" data-title="'+ (type?conifg.title:('新建文件-'+ _index)) +'"></i>\
			</div>\
		</li>');
		$('#ace_editor_' + _id).siblings().removeClass('active');
		$('.ace_conter_editor').append('<div id="ace_editor_'+_id+'" class="ace_editors active">'+ (type?aceShortcutKeys.innerHTML:'') +'</div>');
		switch(type){
			case 0:
				this.creationEditor({ id: _id });
				this.editorLength = this.editorLength + 1;
			break;
			case 1:
				this.removerStatusBar();
				this.editorLength = this.editorLength + 1;
			break;
		}
	},
	// 删除编辑器视图-方法
	removeEditor: function (id) {
		if(id == undefined) id = this.ace_active;
		if ($('.item_tab_' + id).next().length != 0 && this.editorLength != 1) {
			$('.item_tab_' + id).next().click();
		} else if($('.item_tab_' + id).prev.length !=  0 && this.editorLength != 1){
			$('.item_tab_' + id).prev().click();
		}
		$('.item_tab_' + id).remove();
		$('#ace_editor_' + id).remove();
		this.editorLength --;
		if(this.editor[id] == undefined) return false;
		for(var i=0;i<this.pathAarry.length;i++){
		    if(this.pathAarry[i] == this.editor[id].path){
		        this.pathAarry.splice(i,1);
		    }
		}
		if(!this.editor[id].historys_file) $('[data-menu-path="'+ (this.editor[id].path) +'"]').find('.file_fold').removeClass('active bg');
		delete this.editor[id];
		if(this.editorLength === 0){
			this.ace_active = '';
			this.pathAarry = [];
			this.removerStatusBar();
		}else{
			this.currentStatusBar(this.ace_active);
		}
	},
	// 打开编辑器文件-方法
	openEditorView: function (path,callback) {
		if(path == undefined) return false;
		// 文件类型（type，列如：JavaScript） 、文件模型（mode，列如：text）、文件标识（id,列如：x8AmsnYn）、文件编号（index,列如：0）、文件路径 (path，列如：/www/root/)
	    var _this = this,paths = path.split('/'),_fileName = paths[paths.length - 1],_fileType = this.getFileType(_fileName),_type = _fileType.name,_mode = _fileType.mode,_id = bt.get_random(8),_index = this.editorLength;
		_this.is_file_open(path,function(is_state){
			if(is_state){
				$('.ace_conter_menu').find('[title="'+ path +'"]').click();
			}else{
				_this.getFileBody({path: path}, function (res) {
				    _this.pathAarry.push(path);
				    $('.ace_conter_menu .item').removeClass('active');
		    		$('.ace_conter_editor .ace_editors').removeClass('active');
		    		$('.ace_conter_menu').append('<li class="item active item_tab_' + _id +'" title="'+ path +'" data-type="'+ _type +'" data-mode="'+ _mode +'" data-id="'+ _id +'" data-fileName="'+ _fileName +'">'+
		    			'<div class="ace_item_box">'+
			    			'<span class="icon_file"><i class="'+ _mode +'-icon"></i></span><span title="'+ path +'">' + _fileName + '</span>'+
			    			'<i class="glyphicon glyphicon-remove icon-tool" aria-hidden="true" data-file-state="0" data-title="' + _fileName + '"></i>'+
			    		'</div>'+
		    		'</li>');
		    		$('.ace_conter_editor').append('<div id="ace_editor_'+_id +'" class="ace_editors active" style="font-size:'+ aceEditor.aceConfig.aceEditor.fontSize +'px"></div>');
					$('[data-menu-path="'+ path +'"]').find('.file_fold').addClass('active bg');
					_this.ace_active = _id;
				    _this.editorLength = _this.editorLength + 1;
					_this.creationEditor({id: _id,fileName: _fileName,path: path,mode:_mode,encoding: res.encoding,data: res.data,type:_type,historys:res.historys});
					if(callback) callback(res);
				});
			}
		});
		$('.ace_toolbar_menu').hide();
	},
	// 获取文件内容-请求
	getFileBody: function (obj, callback) {
		var loadT = layer.msg('正在获取文件内容，请稍后...',{time: 0,icon: 16,shade: [0.3, '#000']}),_this = this;
		$.post("/files?action=GetFileBody", "path=" + encodeURIComponent(obj.path), function(res) {
			layer.close(loadT);
			if (!res.status) {
				if(_this.editorLength == 0) layer.closeAll();
				layer.msg(res.msg, {icon: 2});
				
				return false;
			}else{
				if(!aceEditor.isAceView){
				    var _path =  obj.path.split('/');
					layer.msg('已打开文件【'+ (_path[_path.length-1]) +'】');
				}
			}
			if (callback) callback(res);
		});
	},
	// 保存文件内容-请求
	saveFileBody: function (obj,success,error) {
		$.ajax({
			type:'post',
			url:'/files?action=SaveFileBody',
			timeout: 7000, //设置保存超时时间
			data:{
				data:obj.data,
				encoding:obj.encoding.toLowerCase(),
				path:obj.path
			},
			success:function(rdata){
				if(rdata.status){
					if(success) success(rdata)
				}else{
					if(error) error(rdata)
				}
				if(!obj.tips) layer.msg(rdata.msg,{icon:rdata.status?1:2});
			},
			error:function(err){
			    if(error) error(err)
			}
		});
	},
// 	保存ace配置
	saveAceConfig:function(data,callback){
		var loadT = layer.msg('正在设置配置文件，请稍后...',{time: 0,icon: 16,shade: [0.3, '#000']}),_this = this;
		this.saveFileBody({
			path:'ace_config/ace.editor.config.json',
			data:JSON.stringify(data),
			encoding:'utf-8',
			tips:true,
		},function(rdata){
			layer.close(loadT);
			_this.setStorage('aceConfig',JSON.stringify(data));
			if(callback) callback(rdata);
		});
	},
	// 获取配置文件
	getAceConfig:function(callback){
		var loadT = layer.msg('正在获取配置文件，请稍后...',{time: 0,icon: 16,shade: [0.3, '#000']}),_this = this;
		this.getFileBody({path:'ace_config/ace.editor.config.json'},function(rdata){
			layer.close(loadT);
			_this.setStorage('aceConfig',JSON.stringify(rdata.data));
			if(callback) callback(JSON.parse(rdata.data));
		});
	},
	// 递归保存文件
	saveAllFileBody:function(arry,num,callabck) {
		var _this = this;
		if(typeof num == "function"){
			callabck = num; num = 0;
		}else if(typeof num == "undefined"){
			num = 0;
		}
		if(num == arry.length){
			if(callabck) callabck();
			layer.msg('全部保存成功',{icon:1});
			return false;
		}
		aceEditor.saveFileBody({
			path: arry[num].path,
			data: arry[num].data,
			encoding: arry[num].encoding
		},function(){
			num = num + 1;
			aceEditor.saveAllFileBody(arry,num,callabck);
		});
	}
}
// 在线编辑器
function openEditorView(type,path){
	var paths = path.split('/'),
	_fileName = paths[paths.length -1], 
		_aceTmplate = document.getElementById("aceTmplate").innerHTML;
		_aceTmplate = _aceTmplate.replace(/\<\\\/script\>/g,'</script>');
	if(aceEditor.editor !== null){
		if(aceEditor.isAceView == false){
			aceEditor.isAceView = true;
			$('.aceEditors .layui-layer-max').click();
		}
		aceEditor.openEditorView(path);
		return false;
	}
	var r = layer.open({
		type: 1,
		maxmin: true,
		shade:false,
		area: ['80%','80%'],
		title: "在线文本编辑器",
		skin:'aceEditors',
		zIndex:19999,
		content: _aceTmplate,
		success:function(layero,index){
			function set_edit_file(){
				aceEditor.ace_active = '';
				aceEditor.eventEditor();
				ace.require("/ace/ext/language_tools");
				ace.config.set("modePath", "/static/ace");
				ace.config.set("workerPath", "/static/ace");
				ace.config.set("themePath", "/static/ace");
				aceEditor.openEditorView(path);
				$('#ace_conter').addClass(aceEditor.aceConfig.aceEditor.editorTheme);
				$('.aceEditors .layui-layer-min').click(function (e){
					aceEditor.setEditorView();
				});
				$('.aceEditors .layui-layer-max').click(function (e){
					aceEditor.setEditorView();
				});
			}
			var aceConfig =  aceEditor.getStorage('aceConfig');
			if(aceConfig == null){
				// 获取编辑器配置
				aceEditor.getAceConfig(function(res){
					aceEditor.aceConfig = res; // 赋值配置参数
					set_edit_file();
				});
            }else{
            	aceEditor.aceConfig = JSON.parse(aceConfig);
            	typeof aceEditor.aceConfig == 'string'?aceEditor.aceConfig = JSON.parse(aceEditor.aceConfig):''
                set_edit_file();
			}
		},
		cancel:function(){
			for(var item in aceEditor.editor){
				if(aceEditor.editor[item].fileType == 1){
					layer.open({
						type: 1,
						area: ['400px', '180px'],
						title: '保存提示',
						content: '<div class="ace-clear-form">\
							<div class="clear-icon"></div>\
							<div class="clear-title">检测到文件未保存，是否保存文件更改？</div>\
							<div class="clear-tips">如果不保存，更改会丢失！</div>\
							<div class="ace-clear-btn" style="">\
								<button type="button" class="btn btn-sm btn-default" style="float:left" data-type="2">不保存文件</button>\
								<button type="button" class="btn btn-sm btn-default" style="margin-right:10px;" data-type="1">取消</button>\
								<button type="button" class="btn btn-sm btn-success" data-type="0">保存文件</button>\
							</div>\
						</div>',
						success: function (layers, indexs) {
							$('.ace-clear-btn button').click(function(){
								var _type = $(this).attr('data-type');
								switch(_type){
									case '2':
										aceEditor.editor = null;
										aceEditor.editorLength = 0;
										aceEditor.pathAarry = [];
										layer.closeAll();
									break;
									case '1':
										layer.close(indexs);
									break;
									case '0':
										var _arry = [],editor = aceEditor['editor'];
										for(var item in editor){
											_arry.push({
												path: editor[item]['path'],
												data: editor[item]['ace'].getValue(),
												encoding: editor[item]['encoding'],
											})
										}
										aceEditor.saveAllFileBody(_arry,function(){
											$('.ace_conter_menu>.item').each(function (el,indexx) {
												var _id = $(this).attr('data-id');
												$(this).find('i').removeClass('glyphicon-exclamation-sign').addClass('glyphicon-remove').attr('data-file-state','0')
												aceEditor.editor[_id].fileType = 0;
											});
											aceEditor.editor = null;
											aceEditor.pathAarry = [];
											layer.closeAll();
										});
									break;
								}
							});
						}
					});
					return false;
				}
			}
		},
		end:function(){
		    aceEditor.ace_active = '';
		    aceEditor.editor = null;
		    aceEditor.pathAarry = [];
		    aceEditor.menu_path = '';
		}
	});
}
function BackFile() {
	var c = $("#PathPlace").find("span").text();
	if(c.substr(c.length - 1, 1) == "/") {
		c = c.substr(0, c.length - 1)
	}
	var d = c.split("/");
	var a = "";
	if(d.length > 1) {
		var e = d.length - 1;
		for(var b = 0; b < e; b++) {
			a += d[b] + "/"
		}
		GetDiskList(a.replace("//", "/"))
	} else {
		a = d[0]
	}
	if(d.length == 1) {}
}
function GetfilePath() {
	var a = $("#PathPlace").find("span").text();
	a = a.replace(new RegExp(/(\\)/g), "/");
	setCookie('path_dir_change',a);
	$("#" + getCookie("SetId")).val(a + getCookie("SetName"));
	layer.close(getCookie("ChangePath"))
}
function BackMyComputer() {
	$(".default").show();
	$(".file-list").hide();
	$("#PathPlace").find("span").html("");
	ActiveDisk()
}
function ActiveDisk() {
	var a = $("#PathPlace").find("span").text().substring(0, 1);
	switch(a) {
		case "C":
			$(".path-con-left dd:nth-of-type(1)").css("background", "#eee").siblings().removeAttr("style");
			break;
		case "D":
			$(".path-con-left dd:nth-of-type(2)").css("background", "#eee").siblings().removeAttr("style");
			break;
		case "E":
			$(".path-con-left dd:nth-of-type(3)").css("background", "#eee").siblings().removeAttr("style");
			break;
		case "F":
			$(".path-con-left dd:nth-of-type(4)").css("background", "#eee").siblings().removeAttr("style");
			break;
		case "G":
			$(".path-con-left dd:nth-of-type(5)").css("background", "#eee").siblings().removeAttr("style");
			break;
		case "H":
			$(".path-con-left dd:nth-of-type(6)").css("background", "#eee").siblings().removeAttr("style");
			break;
		default:
			$(".path-con-left dd").removeAttr("style")
	}
}
// 设置cookie
function setCookie(a, c) {
	var b = 30;
	var d = new Date();
	d.setTime(d.getTime() + b * 24 * 60 * 60 * 1000);
	document.cookie = a + "=" + escape(c) + ";expires=" + d.toGMTString()
}
// 读取cookie
function getCookie(b) {
	var a, c = new RegExp("(^| )" + b + "=([^;]*)(;|$)");
	if(a = document.cookie.match(c)) {
		return unescape(a[2])
	} else {
		return null
	}
}
// 中文转码
function isChineseChar(b) {
	var a = /[\u4E00-\u9FA5\uF900-\uFA2D]/;
	return a.test(b)
}
// 二次确认信息
function SafeMessage(j, h, g, f) {
	if(f == undefined) {
		f = ""
	}
	var d = Math.round(Math.random() * 9 + 1);
	var c = Math.round(Math.random() * 9 + 1);
	var e = "";
	e = d + c;
	sumtext = d + " + " + c;
	setCookie("vcodesum", e);
	var mess = layer.open({
		type: 1,
		title: j,
		area: "350px",
		closeBtn: 2,
		shadeClose: true,
		content: "<div class='bt-form webDelete pd20 pb70'><p>" + h + "</p>" + f + "<div class='vcode'>"+lan.bt.cal_msg+"<span class='text'>" + sumtext + "</span>=<input type='number' id='vcodeResult' value=''></div><div class='bt-form-submit-btn'><button type='button' class='btn btn-danger btn-sm bt-cancel'>"+lan.public.cancel+"</button> <button type='button' id='toSubmit' class='btn btn-success btn-sm' >"+lan.public.ok+"</button></div></div>"
	});
	$("#vcodeResult").focus().keyup(function(a) {
		if(a.keyCode == 13) {
			$("#toSubmit").click()
		}
	});
	$(".bt-cancel").click(function(){
		layer.close(mess);
	});
	$("#toSubmit").click(function() {
		var a = $("#vcodeResult").val().replace(/ /g, "");
		if(a == undefined || a == "") {
			layer.msg('请正确输入计算结果!');
			return
		}
		if(a != getCookie("vcodesum")) {
			layer.msg('请正确输入计算结果!');
			return
		}
		layer.close(mess);
		g();
	})
}
// 转时间戳
function getLocalTime(a) {
	a = a.toString();
	if(a.length > 10) {
		a = a.substring(0, 10)
	}
	return new Date(parseInt(a) * 1000).format("yyyy/MM/dd hh:mm:ss")
}
// 自定义时间戳格式
Date.prototype.format = function(b) {
	var c = {
		"M+": this.getMonth() + 1,
		"d+": this.getDate(),
		"h+": this.getHours(),
		"m+": this.getMinutes(),
		"s+": this.getSeconds(),
		"q+": Math.floor((this.getMonth() + 3) / 3),
		S: this.getMilliseconds()
	};
	if(/(y+)/.test(b)) {
		b = b.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length))
	}
	for(var a in c) {
		if(new RegExp("(" + a + ")").test(b)) {
			b = b.replace(RegExp.$1, RegExp.$1.length == 1 ? c[a] : ("00" + c[a]).substr(("" + c[a]).length))
		}
	}
	return b
};
// 转大小
function ToSize(a) {
	var d = [" B", " KB", " MB", " GB", " TB", " PB"];
	var e = 1024;
	for(var b = 0; b < d.length; b++) {
		if(a < e) {
			return(b == 0 ? a : a.toFixed(2)) + d[b]
		}
		a /= e
	}
}
// 加载js
function loadScript(arry,param,callback) {
	var ready = 0;
	if(typeof param === 'function') callback = param
	for(var i=0;i<arry.length;i++){
		if(!Array.isArray(bt['loadScript'])) bt['loadScript'] = []
		if(!is_file_existence(arry[i],true)){
			if((arry.length -1) === i && callback) callback();
			continue;
		};
		var script = document.createElement("script"),_arry_split = arry[i].split('/');
			script.type = "text/javascript";
		if(typeof(callback) != "undefined"){
		    if (script.readyState) {
			    (function(i){
			    	script.onreadystatechange = function () {
			      		if (script.readyState == "loaded" || script.readyState == "complete") {
				          script.onreadystatechange = null;
				          bt['loadScript'].push(arry[i]);
				          ready ++;
				        }
			    	};
			    })(i);
		    } else {
		    	(function(i){
					script.onload=function () {
			        	bt['loadScript'].push(arry[i]);
			        	ready ++;
					};
		    	})(i);
			}
		}
		script.src = arry[i];
		document.body.appendChild(script);
	}
	var time = setInterval(function(){
		if(ready === arry.length){
			clearTimeout(time);
			callback();
		}
	},10);
}