// 拖拽上传
var fileDrop = {
  startTime: 0,
  endTime:0,
  uploadLength:0, //上传数量
  splitSize: 1024 * 1024 * 2, //文件上传分片大小
  splitEndTime: 0,
  splitStartTime:0,
  fileSize:0,
  speedLastTime:0,
  filesList:[], // 文件列表数组
  errorLength:0, //上传失败文件数量
  isUpload:true, //上传状态，是否可以上传
  uploadSuspend:[],  //上传暂停参数
  isUploadNumber:800,//限制单次上传数量
  uploadAllSize:0, // 上传文件总大小
  uploadedSize:0, // 已上传文件大小
  updateedSizeLast:0,
  topUploadedSize:0, // 上一次文件上传大小
  uploadExpectTime:0, // 预计上传时间
  initTimer:0, // 初始化计时
  speedInterval:null, //平局速度定时器
  timerSpeed:0, //速度
  isLayuiDrop:false, //是否是小窗口拖拽
  uploading:false,
  is_webkit:(function(){
      if(navigator.userAgent.indexOf('WebKit') > -1) return true;
      return false;
  })(),
  init:function(){
      if($('#mask_layer').length == 0) {
          window.UploadFiles = function(){ fileDrop.dialog_view()};
          $("body").append($('<div class="mask_layer" id="mask_layer" style="position:fixed;top:0;left:0;right:0;bottom:0; background:rgba(255,255,255,0.6);border:3px #ccc dashed;z-index:99999999;display:none;color:#999;font-size:40px;text-align:center;overflow:hidden;"><span style="position: absolute;top: 50%;left: 50%;margin-left: -300px;margin-top: -40px;">上传文件到当前目录下'+ (!this.is_webkit?'<i style="font-size:20px;font-style:normal;display:block;margin-top:15px;color:red;">当前浏览器暂不支持拖动上传，推荐使用Chrome浏览器或WebKit内核的浏览。</i>':'') +'</span></div>'));
          this.event_relation(document.querySelector('#container'),document,document.querySelector('#mask_layer'));
      }
  },
  // 事件关联 (进入，离开，放下)
  event_relation:function(enter,leave,drop){
      var that = this,obj = Object.keys(arguments);
      for(var item in arguments){
          if(typeof arguments[item] == "object" && typeof arguments[item].nodeType != 'undefined'){
              arguments[item] = {
                  el:arguments[item],
                  callback:null
              }
          }
      }
      leave.el.addEventListener("dragleave",(leave.callback != null)?leave.callback:function(e){
          if(e.x == 0 && e.y == 0) $('#mask_layer').hide();
          e.preventDefault();
      },false);
      enter.el.addEventListener("dragenter", (enter.callback != null)?enter.callback:function(e){
          if(e.dataTransfer.items[0].kind == 'string') return false
          $('#mask_layer').show();
          that.isLayuiDrop = false;
          e.preventDefault();
      },false);
      drop.el.addEventListener("dragover",function(e){ e.preventDefault() }, false);
      drop.el.addEventListener("drop",(enter.callback != null)?drop.callback:that.ev_drop, false);
  },

  
  // 事件触发
  ev_drop:function(e){
      if(!fileDrop.is_webkit){
          $('#mask_layer').hide();
          return false;
      }
      e.preventDefault();
      if(fileDrop.uploading){
        layer.msg('正在上传文件中，请稍后...');
        return false;
      }
      var items = e.dataTransfer.items,time,num = 0;
          loadT = layer.msg('正在获取上传文件信息，请稍后...',{icon:16,time:0,shade:.3});
      fileDrop.isUpload = true;
      if(items && items.length && items[0].webkitGetAsEntry != null) {
          if(items[0].kind != 'file') return false;
      }
      if(fileDrop.filesList == null) fileDrop.filesList = []
      for(var i = fileDrop.filesList.length -1; i >= 0 ; i--){
          if(fileDrop.filesList[i].is_upload) fileDrop.filesList.splice(-i,1)
      }
      $('#mask_layer').hide();
      function update_sync(s){
          s.getFilesAndDirectories().then(function(subFilesAndDirs) {
              return iterateFilesAndDirs(subFilesAndDirs, s.path);
          });
      }

      var iterateFilesAndDirs = function(filesAndDirs, path) {
          if(!fileDrop.isUpload) return false
    for (var i = 0; i < filesAndDirs.length; i++) {
      if (typeof(filesAndDirs[i].getFilesAndDirectories) == 'function') {
                  update_sync(filesAndDirs[i])
      } else {
          if(num > fileDrop.isUploadNumber){
              fileDrop.isUpload = false;
                      layer.msg(' '+ fileDrop.isUploadNumber +'份，无法上传,请压缩后上传!。',{icon:2,area:'405px'});
                      clearTimeout(time);
                      return false;
                  }
                  fileDrop.filesList.push({
                      file:filesAndDirs[i],
                      path:bt.get_file_path(path +'/'+ filesAndDirs[i].name).replace('//','/'),
                      name:filesAndDirs[i].name.replace('//','/'),
                      icon:GetExtName(filesAndDirs[i].name),
                      size:fileDrop.to_size(filesAndDirs[i].size),
                      upload:0, //上传状态,未上传：0、上传中：1，已上传：2，上传失败：-1
                      is_upload:false
                  });
                  fileDrop.uploadAllSize += filesAndDirs[i].size
                  clearTimeout(time);
                  time = setTimeout(function(){
                      layer.close(loadT);
                      fileDrop.dialog_view();
                  },100);
                  num ++;
      }
    }
  }
  if('getFilesAndDirectories' in e.dataTransfer){
    e.dataTransfer.getFilesAndDirectories().then(function(filesAndDirs) {
       return iterateFilesAndDirs(filesAndDirs, '/');
    });
  }
      
  },
  // 上传视图
  dialog_view:function(config){
      var that = this,html = '';
      if(!$('.file_dir_uploads').length > 0){
        if(that.filesList == null) that.filesList = []
          for(var i =0; i<that.filesList.length; i++){
              var item = that.filesList[i];
             html +='<li><div class="fileItem"><span class="filename" title="文件路径:'+ (item.path + '/' + item.name).replace('//','/') +'&#10;文件类型:'+ item.file.type +'&#10;文件大小:'+ item.size +'"><i class="ico ico-'+ item.icon + '"></i>'+ (item.path + '/' + item.name).replace('//','/') +'</span><span class="filesize">'+ item.size +'</span><span class="fileStatus">'+ that.is_upload_status(item.upload) +'</span></div><div class="fileLoading"></div></li>';
          }
          var is_show = that.filesList.length > 11;
          layer.open({
              type: 1,
              closeBtn: 1,
              maxmin:true,
              area: ['640px','605px'],
              btn:['开始上传','取消上传'],
              title: '上传文件到【'+ bt.get_cookie('Path')  +'】--- 支持断点续传',
              skin:'file_dir_uploads',
              content:'<div style="padding:15px 15px 10px 15px;"><div class="upload_btn_groud"><div class="btn-group"><button type="button" class="btn btn-primary btn-sm upload_file_btn">上传文件</button><button type="button" class="btn btn-primary  btn-sm dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><span class="caret"></span><span class="sr-only">Toggle Dropdown</span></button><ul class="dropdown-menu"><li><a href="#" data-type="file">上传文件</a></li><li><a href="#" data-type="dir">上传目录</a></li></ul></div><div class="file_upload_info" style="display:none;"><span>总进度&nbsp;<i class="uploadProgress"></i>，正在上传&nbsp;<i class="uploadNumber"></i>，</span><span style="display:none">上传失败&nbsp;<i class="uploadError"></i></span><span>上传速度&nbsp;<i class="uploadSpeed">获取中</i>，</span><span>预计上传时间&nbsp;<i class="uploadEstimate">获取中</i></span><i></i></div></div><div class="upload_file_body '+ (html==''?'active':'') +'">'+ (html!=''?('<ul class="dropUpLoadFileHead" style="padding-right:'+ (is_show?'15':'0') +'px"><li class="fileTitle"><span class="filename">文件名</span><span class="filesize">文件大小</span><span class="fileStatus">上传状态</span></li></ul><ul class="dropUpLoadFile list-list">'+ html +'</ul>'):'<span>请将需要上传的文件拖到此处'+ (!that.is_webkit?'<i style="display: block;font-style: normal;margin-top: 10px;color: red;font-size: 17px;">当前浏览器暂不支持拖动上传，推荐使用Chrome浏览器或WebKit内核的浏览。</i>':'') +'</span>') +'</div></div>',
              success:function(){
                  $('#mask_layer').hide();
                  $('.file_dir_uploads .layui-layer-max').hide();
                  $('.upload_btn_groud .upload_file_btn').click(function(){$('.upload_btn_groud .dropdown-menu [data-type=file]').click()});
                  $('.upload_btn_groud .dropdown-menu a').click(function(){
                      var type = $(this).attr('data-type');
                      $('<input type="file" multiple="true" autocomplete="off" '+ (type == 'dir'?'webkitdirectory=""':'') +' />').change(function(e){
                          var files = e.target.files,arry = [];
                          for(var i=0;i<files.length;i++){
                              var config = {
                                  file:files[i],
                                  path: bt.get_file_path('/' + files[i].webkitRelativePath).replace('//','/') ,
                                  icon:GetExtName(files[i].name),
                                  name:files[i].name.replace('//','/'),
                                  size:that.to_size(files[i].size),
                                  upload:0, //上传状态,未上传：0、上传中：1，已上传：2，上传失败：-1
                                  is_upload:true
                              }
                              that.filesList.push(config);
                              fileDrop.uploadAllSize += files[i].size
                          }
                          that.dialog_view(that.filesList);
                      }).click();
                  });
                  var el = '';
                  that.event_relation({
                      el:$('.upload_file_body')[0],
                      callback:function(e){
                          if($(this).hasClass('active')){
                              $(this).css('borderColor','#4592f0').find('span').css('color','#4592f0');
                          }
                      }
                  },{
                      el:$('.upload_file_body')[0],
                      callback:function(e){
                          if($(this).hasClass('active')){
                              $(this).removeAttr('style').find('span').removeAttr('style');
                          }
                      }
                  },{
                      el:$('.upload_file_body')[0],
                      callback:function (e) {
                          var active = $('.upload_file_body');
                          if(active.hasClass('active')){
                              active.removeAttr('style').find('span').removeAttr('style');
                          }
                          that.ev_drop(e);
                          that.isLayuiDrop = true;
                      }
                  });
              },
              yes:function(index, layero){
                  if(!that.uploading){
                      if(that.filesList.length == 0){
                          layer.msg('请选择上传文件',{icon:0});
                          return false;
                      }
                      $('.layui-layer-btn0').css({'cursor':'no-drop','background':'#5c9e69'}).attr('data-upload','true').text('上传中');
                      that.upload_file();
                      that.initTimer = new Date();
                      that.uploading = true;
                      //that.get_timer_speed();
                  }
              },
              btn2:function (index, layero){
                  if(that.uploading){
                      layer.confirm('是否取消上传当前列表的文件，若取消上传，已上传的文件，需用户手动删除，是否继续？',{title:'取消上传文件',icon:0},function(indexs){
                          layer.close(index);
                          layer.close(indexs);
                      });
                      return false;
                  }else{
                      layer.close(index);
                  }
              },
              cancel:function(index, layero){
                  if(that.uploading){
                      layer.confirm('是否取消上传当前列表的文件，若取消上传，已上传的文件，需用户手动删除，是否继续？',{title:'取消上传文件',icon:0},function(indexs){
                          layer.close(index);
                          layer.close(indexs);
                      });
                      return false;
                  }else{
                      layer.close(index);
                  }
              },
              end:function (){
                  GetFiles(bt.get_cookie('Path'));
                  that.clear_drop_stauts(true);
              },
              min:function(){
                  $('.file_dir_uploads .layui-layer-max').show();
                  $('#layui-layer-shade'+$('.file_dir_uploads').attr('times')).fadeOut();
              },
              restore:function(){
                  $('.file_dir_uploads .layui-layer-max').hide();
                  $('#layui-layer-shade'+$('.file_dir_uploads').attr('times')).fadeIn();
              }
          });
      }else{
          if(config == undefined && !that.isLayuiDrop) return false;
          if(that.isLayuiDrop) config = that.filesList;
          $('.upload_file_body').html('<ul class="dropUpLoadFileHead" style="padding-right:'+ (config.length>11?'15':'0') +'px"><li class="fileTitle"><span class="filename">文件名</span><span class="filesize">文件大小</span><span class="fileStatus">上传状态</span></li></ul><ul class="dropUpLoadFile list-list"></ul>').removeClass('active');
          if(Array.isArray(config)){
              for(var i =0; i<config.length; i++){
                  var item = config[i];
                  html +='<li><div class="fileItem"><span class="filename" title="文件路径:'+ item.path + '/' + item.name +'&#10;文件类型:'+ item.file.type +'&#10;文件大小:'+ item.size +'"><i class="ico ico-'+ item.icon + '"></i>'+ (item.path + '/' + item.name).replace('//','/')  +'</span><span class="filesize">'+ item.size +'</span><span class="fileStatus">'+ that.is_upload_status(item.upload) +'</span></div><div class="fileLoading"></div></li>';
              }
              $('.dropUpLoadFile').append(html);
          }else{
              $('.dropUpLoadFile').append('<li><div class="fileItem"><span class="filename" title="文件路径:'+ (config.path + '/' + config.name).replace('//','/') +'&#10;文件类型:'+ config.type +'&#10;文件大小:'+ config.size +'"><i class="ico ico-'+ config.icon + '"></i>'+ (config.path + '/' + config.name).replace('//','/') +'</span><span class="filesize">'+ config.size +'</span><span class="fileStatus">'+ that.is_upload_status(config.upload) +'</span></div><div class="fileLoading"></div></li>');
          }

      }
  },
  // 上传单文件状态
  is_upload_status:function(status,val){
      if(val === undefined) val = ''
      switch(status){
          case -1:
              return '<span class="upload_info upload_error" title="上传失败'+ (val != ''?','+val:'') +'">上传失败'+ (val != ''?','+val:'') +'</span>';
          break;                    
          case 0:
              return '<span class="upload_info upload_primary">等待上传</span>';
          break;   
          case 1:
              return '<span class="upload_info upload_success">上传成功</span>';
          break;
          case 2:
              return '<span class="upload_info upload_warning">上传中'+ val+'</span>';
          break;
          case 3:
              return '<span class="upload_info upload_success">已暂停</span>';
          break;
      }
  },
  // 设置上传实时反馈视图
  set_upload_view:function(index,config){
      var item = $('.dropUpLoadFile li:eq('+ index +')'),that = this;
      var file_info = $('.file_upload_info');
      if($('.file_upload_info .uploadProgress').length == 0){
        $('.file_upload_info').html('<span>总进度&nbsp;<i class="uploadProgress"></i>，正在上传&nbsp;<i class="uploadNumber"></i>，</span><span style="display:none">上传失败&nbsp;<i class="uploadError"></i></span><span>上传速度&nbsp;<i class="uploadSpeed">获取中</i>，</span><span>预计上传时间&nbsp;<i class="uploadEstimate">获取中</i></span><i></i>');
      }
      file_info.show().prev().hide().parent().css('paddingRight',0);
      if(that.errorLength > 0) file_info.find('.uploadError').text('('+ that.errorLength +'份)').parent().show();
      file_info.find('.uploadNumber').html('('+ that.uploadLength +'/'+ that.filesList.length +')');
      file_info.find('.uploadProgress').html( ((that.uploadedSize / that.uploadAllSize) * 100).toFixed(2) +'%');
      if(config.upload === 1 || config.upload === -1){
          that.filesList[index].is_upload = true;
          that.uploadLength += 1;
          item.find('.fileLoading').css({'width':'100%','opacity':'.5','background': config.upload == -1?'#ffadad':'#20a53a21'});
          item.find('.filesize').text(config.size);
          item.find('.fileStatus').html(that.is_upload_status(config.upload,(config.upload === 1?('(耗时:'+ that.diff_time(that.startTime,that.endTime) +')'):config.errorMsg)));
          item.find('.fileLoading').fadeOut(500,function(){
              $(this).remove();
              var uploadHeight = $('.dropUpLoadFile');
              if(uploadHeight.length == 0) return false;
              if(uploadHeight[0].scrollHeight > uploadHeight.height()){
                  uploadHeight.scrollTop(uploadHeight.scrollTop()+40);
              }
          });
      }else{
          item.find('.fileLoading').css('width',config.percent);
          item.find('.filesize').text(config.upload_size +'/'+ config.size);
          item.find('.fileStatus').html(that.is_upload_status(config.upload,'('+ config.percent +')'));
      }
  },
  // 清除上传状态
  clear_drop_stauts:function(status){
      var time = new Date(),that = this;
      if(!status){
        try {
              var s_peed  = fileDrop.to_size(fileDrop.uploadedSize / ((time.getTime() - fileDrop.initTimer.getTime()) / 1000))
          $('.file_upload_info').html('<span>上传成功 '+ this.uploadLength +'个文件，'+ (this.errorLength>0?('上传失败 '+ this.errorLength +'个文件，'):'') +'耗时'+ this.diff_time(this.initTimer,time) + '，平均速度 '+ s_peed +'/s</span>').append($('<i class="ico-tips-close"></i>').click(function(){
                $('.file_upload_info').hide().prev().show();
            }));
        } catch (e) {
          
        }
      }
      $('.layui-layer-btn0').removeAttr('style data-upload').text('开始上传');
      $.extend(fileDrop,{
          startTime: 0,
          endTime:0,
          uploadLength:0, //上传数量
          splitSize: 1024 * 1024 * 2, //文件上传分片大小
          filesList:[], // 文件列表数组
          errorLength:0, //上传失败文件数量
          isUpload:false, //上传状态，是否可以上传
          isUploadNumber:800,//限制单次上传数量
          uploadAllSize:0, // 上传文件总大小
          uploadedSize:0, // 已上传文件大小
          topUploadedSize:0, // 上一次文件上传大小
          uploadExpectTime:0, // 预计上传时间
          initTimer:0, // 初始化计时
          speedInterval:null, //平局速度定时器
          timerSpeed:0, //速度
          uploading:false
      });
      clearInterval(that.speedInterval);
  },
  // 上传文件,文件开始字段，文件编号
  upload_file:function(fileStart,index){
      
      if(fileStart == undefined && this.uploadSuspend.length == 0) fileStart = 0,index = 0;
      if(this.filesList.length === index){
          clearInterval(this.speedInterval);
          this.clear_drop_stauts();
          GetFiles(bt.get_cookie('Path'));
          return false;
      }
      var that = this;
      that.splitEndTime = new Date().getTime()
      that.get_timer_speed()

      that.splitStartTime = new Date().getTime()
      var item = this.filesList[index],fileEnd = '';
      if(item == undefined) return false;
      fileEnd = Math.min(item.file.size, fileStart + this.splitSize),
      that.fileSize = fileEnd - fileStart
      form = new FormData();
      if(fileStart == 0){
          that.startTime = new Date();
          item = $.extend(item,{percent:'0%',upload:2,upload_size:'0B'});
      }
      form.append("f_path", bt.get_cookie('Path') + item.path);
      form.append("f_name", item.name);
      form.append("f_size", item.file.size);
      form.append("f_start", fileStart);
      form.append("blob", item.file.slice(fileStart, fileEnd));
      that.set_upload_view(index,item);
      $.ajax({
          url:'/files?action=upload', // 上传文件接口
          type: "POST",
          data: form,
          async: true,
          processData: false,
          contentType: false,
          success:function(data){
              if(typeof(data) === "number"){
                  that.set_upload_view(index,$.extend(item,{percent:(((data / item.file.size)* 100).toFixed(2)  +'%'),upload:2,upload_size:that.to_size(data)}));
                  if(fileEnd != data){
                      that.uploadedSize += data;
                  }else{
                      that.uploadedSize += parseInt(fileEnd - fileStart);  
                  }

                  that.upload_file(data,index);
              }else{
                  if(data.status){
                      that.endTime = new Date();
                      that.uploadedSize += parseInt(fileEnd - fileStart);
                      that.set_upload_view(index,$.extend(item,{upload:1,upload_size:item.size}));
                      that.upload_file(0,index += 1);
                  }else{
                      that.set_upload_view(index,$.extend(item,{upload:-1,errorMsg:data.msg}));
                      that.errorLength ++;
                  }
              }
              
          },
          error:function(e){
              if(that.filesList[index].req_error === undefined) that.filesList[index].req_error = 1
              if(that.filesList[index].req_error > 2){
                  that.set_upload_view(index,$.extend(that.filesList[index],{upload:-1,errorMsg:e.statusText == 'error'?'网络中断':e.statusText }));
                  that.errorLength ++;
                  that.upload_file(fileStart,index += 1)
                  return false;
              }
              that.filesList[index].req_error += 1;
              that.upload_file(fileStart,index)

              
          }
      });
  }, 
  // 获取上传速度
  get_timer_speed:function(speed){
      var done_time = new Date().getTime()
      if(done_time - this.speedLastTime > 1000){
          var that = this,num = 0;
          if(speed == undefined) speed = 200
          var s_time = (that.splitEndTime - that.splitStartTime) / 1000;
          that.timerSpeed = (that.fileSize / s_time).toFixed(2)
          that.updateedSizeLast = that.uploadedSize
          if(that.timerSpeed < 2) return;

          $('.file_upload_info .uploadSpeed').text(that.to_size(isNaN(that.timerSpeed)?0:that.timerSpeed)+'/s');
          var estimateTime = that.time(parseInt(((that.uploadAllSize - that.uploadedSize) / that.timerSpeed) * 1000))
          if(!isNaN(that.timerSpeed)) $('.file_upload_info .uploadEstimate').text(estimateTime.indexOf('NaN') == -1?estimateTime:'0秒');
          this.speedLastTime = done_time;
      }
  },
  time:function(date){
      var hours = Math.floor(date / (60 * 60 * 1000));
      var minutes = Math.floor(date / (60 * 1000));
      var seconds = parseInt((date % (60 * 1000)) / 1000);
      var result = seconds + '秒';
      if(minutes > 0) {
          result = minutes + "分钟" + seconds  + '秒';
      }
      if(hours > 0){
          result = hours + '小时' + Math.floor((date - (hours * (60 * 60 * 1000))) / (60 * 1000))  + "分钟";
      }
      return result
  },
  diff_time: function (start_date, end_date) {
      var diff = end_date.getTime() - start_date.getTime();
      var minutes = Math.floor(diff / (60 * 1000));
      var leave3 = diff % (60 * 1000);
      var seconds = leave3 / 1000
      var result = seconds.toFixed(minutes > 0?0:2) + '秒';
      if (minutes > 0) {
          result = minutes + "分" + seconds.toFixed(0) + '秒'
      }
      return result
  },
  
  to_size: function (a) {
      var d = [" B", " KB", " MB", " GB", " TB", " PB"];
      var e = 1024;
      for (var b = 0; b < d.length; b += 1) {
          if (a < e) {
              var num = (b === 0 ? a : a.toFixed(2)) + d[b];
              return (!isNaN((b === 0 ? a : a.toFixed(2))) && typeof num != 'undefined')?num:'0B';
          }
          a /= e
      }
  }
}
// 获取磁盘信息
function GetDisk() {
  var LBody = '';
  $.get('/system?action=GetDiskInfo', function (rdata) {
      for (var i = 0; i < rdata.length; i++) {
          LBody += "<span onclick=\"GetFiles('" + rdata[i].path + "')\"><span class='glyphicon glyphicon-hdd'></span>&nbsp;" + (rdata[i].path == '/' ? lan.files.path_root : rdata[i].path) + "(" + rdata[i].size[2] + ")</span>";
      }
      var trash = '<span id="recycle_bin" onclick="Recycle_bin(\'open\')" title="' + lan.files.recycle_bin_title + '" style="position: absolute; border-color: #ccc; right: 77px;"><span class="glyphicon glyphicon-trash"></span>&nbsp;' + lan.files.recycle_bin_title + '</span>';
      $("#comlist").html(LBody + trash);
      IsDiskWidth();
  });
}
// 获取当前目录大小
function GetPathSize() {
  var path = encodeURIComponent($("#DirPathPlace input").val());
  layer.msg("正在计算，请稍候", { icon: 16, time: 0, shade: [0.3, '#000'] })
  $.post("/files?action=GetDirSize", "path=" + path, function (rdata) {
      layer.closeAll();
      $("#pathSize").text(rdata)
  })
}
// 计算目录大小
function get_path_size(path) {
  var loadT = layer.msg('正在计算目录大小,请稍候...', { icon: 16, time: 0, shade: [0.3, '#000'] });
  $.post('/files?action=get_path_size', { path: path }, function (rdata) {
      layer.close(loadT);
      var myclass = '.' + rdata.path.replace(/[^\w]/g, '-');
      $(myclass).text(ToSize(rdata.size));
  });
}
// 获取目录文件渲染页面
function GetFiles(Path, sort) {
  var searchtype = Path;
  var p = '1';
  if (!isNaN(Path)) {
      p = Path;
      Path = getCookie('Path');
  }

  Path = path_check(Path);

  var data = {};
  var search = '';
  var searchV = $("#SearchValue").val();
  if (searchV.length > 0 && searchtype == "1") {
      data['search'] = searchV;
      if ($("#search_all")[0].checked) {
          data['all'] = 'True'
      }
  }

  var old_scroll_top = 0;
  if (getCookie('Path') === Path) {
      old_scroll_top = $(".oldTable").scrollTop();
  }
  
  var sorted = '';
  var reverse = '';
  if (!sort) {
      sort = getCookie('files_sort');
      reverse = getCookie(sort + '_reverse');
  } else {
      reverse = getCookie(sort + '_reverse');
      if (reverse === 'True') {
          reverse = 'False';
      } else {
          reverse = 'True';
      }
  }
  if (sort) {
      data['sort'] = sort;
      data['reverse'] = reverse;
      setCookie(sort + '_reverse', reverse);
      setCookie('files_sort', sort);
  }


  var showRow = getCookie('showRow');
  if (!showRow) showRow = '200';
  var Body = '';
  data['path'] = Path;


  if (searchV) {
      var loadT = layer.msg('正在搜索,请稍候...', { icon: 16, time: 0, shade: [0.3, '#000'] });
  }
  var totalSize = 0;
  $.post('/files?action=GetDir&tojs=GetFiles&p=' + p + '&showRow=' + showRow + search, data, function (rdata) {
      if (searchV) layer.close(loadT);
      if (rdata.status === false) {
          layer.msg(rdata.msg, { icon: 2 });
          return;
      }

      var rows = ['10', '50', '100', '200', '500', '1000', '2000'];
      var rowOption = '';
      for (var i = 0; i < rows.length; i++) {
          var rowSelected = '';
          if (showRow == rows[i]) rowSelected = 'selected';
          rowOption += '<option value="' + rows[i] + '" ' + rowSelected + '>' + rows[i] + '</option>';
      }

      $("#filePage").html(rdata.PAGE);
      $("#filePage div").append("<span class='Pcount-item'>每页<select style='margin-left: 3px;margin-right: 3px;border:#ddd 1px solid' class='showRow'>" + rowOption + "</select>条</span>");
      $("#filePage .Pcount").css("left", "16px");
      if (rdata.DIR == null) rdata.DIR = [];
      for (var i = 0; i < rdata.DIR.length; i++) {
          var fmp = rdata.DIR[i].split(";");
          var cnametext = fmp[0];
          fmp[0] = fmp[0].replace(/'/, "\\'");
          if (cnametext.length > 20) {
              cnametext = cnametext.substring(0, 20) + '...'
          }
          if (isChineseChar(cnametext)) {
              if (cnametext.length > 10) {
                  cnametext = cnametext.substring(0, 10) + '...'
              }
          }
          var fileMsg = '';
          if (fmp[0].indexOf('Recycle_bin') != -1) {
              fileMsg = 'PS: 回收站目录,勿动!';
          }
          if (fileMsg != '') {
              fileMsg = '<span style="margin-left: 30px; color: #999;">' + fileMsg + '</span>';
          }
          var timetext = '--';
          if (getCookie("rank") == "a") {
              $("#set_list").addClass("active");
              $("#set_icon").removeClass("active");
              Body += "<tr class='folderBoxTr' data-path='" + rdata.PATH + "/" + fmp[0] + "' filetype='dir'>\
          <td><input type='checkbox' name='id' value='"+ fmp[0] + "'></td>\
          <td class='column-name'><span class='cursor' onclick=\"GetFiles('" + rdata.PATH + "/" + fmp[0] + "')\"><span class='ico ico-folder'></span><a class='text' title='" + fmp[0] + "'>" + cnametext + fileMsg + "</a></span></td>\
          <td><a class='btlink "+ (rdata.PATH + '/' + fmp[0]).replace(/[^\w]/g, '-') + "' onclick=\"get_path_size('" + rdata.PATH + "/" + fmp[0] + "')\">点击计算</a></td>\
          <td>"+ getLocalTime(fmp[2]) + "</td>\
          <td class='editmenu'><span>\
          <a class='btlink' href='javascript:;' onclick=\"CopyFile('" + rdata.PATH + "/" + fmp[0] + "')\">" + lan.files.file_menu_copy + "</a> | \
          <a class='btlink' href='javascript:;' onclick=\"CutFile('" + rdata.PATH + "/" + fmp[0] + "')\">" + lan.files.file_menu_mv + "</a> | \
          <a class='btlink' href=\"javascript:ReName(0,'" + fmp[0] + "');\">" + lan.files.file_menu_rename + "</a> | \
          <a class='btlink' href=\"javascript:Zip('" + rdata.PATH + "/" + fmp[0] + "');\">" + lan.files.file_menu_zip + "</a> | \
          <a class='btlink' href='javascript:;' onclick=\"DeleteDir('" + rdata.PATH + "/" + fmp[0] + "')\">" + lan.files.file_menu_del + "</a></span>\
        </td></tr>";
          }
          else {
              $("#set_icon").addClass("active");
              $("#set_list").removeClass("active");
              Body += "<div class='file folderBox menufolder' data-path='" + rdata.PATH + "/" + fmp[0] + "' filetype='dir' title='" + lan.files.file_name + "：" + fmp[0] + "&#13;" + lan.files.file_size + "：" + ToSize(fmp[1]) + "&#13;" + lan.files.file_etime + "：" + getLocalTime(fmp[2])  + "'>\
          <input type='checkbox' name='id' value='"+ fmp[0] + "'>\
          <div class='ico ico-folder' ondblclick=\"GetFiles('" + rdata.PATH + "/" + fmp[0] + "')\"></div>\
          <div class='titleBox' onclick=\"GetFiles('" + rdata.PATH + "/" + fmp[0] + "')\"><span class='tname'>" + fmp[0] + "</span></div>\
          </div>";
          }
      }
      for (var i = 0; i < rdata.FILES.length; i++) {
          if (rdata.FILES[i] == null) continue;
          var fmp = rdata.FILES[i].split(";");
          var displayZip = isZip(fmp[0]),bodyZip = '',download = '',image_view = '',file_webshell = '';
          var cnametext = fmp[0];
          fmp[0] = fmp[0].replace(/'/, "\\'");
          if (cnametext.length > 48) {
              cnametext = cnametext.substring(0, 48) + '...'
          }
          if (isChineseChar(cnametext)) {
              if (cnametext.length > 16) {
                  cnametext = cnametext.substring(0, 16) + '...'
              }
          }
          if(isPhp(fmp[0])){
            file_webshell = "<a class='btlink' href='javascript:;' onclick=\"php_file_webshell('" + rdata.PATH + "/" + fmp[0] + "')\">" + lan.files.file_menu_webshell + "</a> | ";
          }
          if (displayZip != -1) {
              bodyZip = "<a class='btlink' href='javascript:;' onclick=\"UnZip('" + rdata.PATH + "/" + fmp[0] + "'," + displayZip + ")\">" + lan.files.file_menu_unzip + "</a> | ";
          }
          if (isText(fmp[0])) {
              bodyZip = "<a class='btlink' href='javascript:;' onclick=\"openEditorView(0,'" + rdata.PATH + "/" + fmp[0] + "')\">" + lan.files.file_menu_edit + "</a> | ";
          }

          if (isVideo(fmp[0])) {
              bodyZip = "<a class='btlink' href='javascript:;' onclick=\"GetPlay('" + rdata.PATH + "/" + fmp[0] + "')\">播放</a> | ";
          }

          if (isImage(fmp[0])) {
              image_view = "<a class='btlink' href='javascript:;' onclick=\"GetImage('" + rdata.PATH + "/" + fmp[0] + "')\">" + lan.files.file_menu_img + "</a> | ";
          }
          download = "<a class='btlink' href='javascript:;' onclick=\"GetFileBytes('" + rdata.PATH + "/" + fmp[0] + "'," + fmp[1] + ")\">" + lan.files.file_menu_down + "</a> | ";
          

          totalSize += parseInt(fmp[1]);
          if (getCookie("rank") == "a") {
              var fileMsg = '';
              switch (fmp[0]) {
                  case '.user.ini':
                      fileMsg = 'PS: PHP用户配置文件(防跨站)!';
                      break;
                  case '.htaccess':
                      fileMsg = 'PS: Apache用户配置文件(伪静态)';
                      break;
                  case 'swap':
                      fileMsg = 'PS: 默认设置的SWAP交换分区文件';
                      break;
              }

              if (fmp[0].indexOf('.upload.tmp') != -1) {
                  fileMsg = 'PS: 文件上传临时文件,重新上传从断点续传,可删除';
              }

              if (fileMsg != '') {
                  fileMsg = '<span style="margin-left: 30px; color: #999;">' + fileMsg + '</span>';
              }
              Body += "<tr class='folderBoxTr' data-path='" + rdata.PATH + "/" + fmp[0] + "' filetype='" + fmp[0] + "'><td><input type='checkbox' name='id' value='" + fmp[0] + "'></td>\
          <td class='column-name'><span class='ico ico-"+ (GetExtName(fmp[0])) + "'></span><a class='text' title='" + fmp[0] + "'>" + cnametext + fileMsg + "</a></td>\
          <td>" + (ToSize(fmp[1])) + "</td>\
          <td>" + ((fmp[2].length > 11) ? fmp[2] : getLocalTime(fmp[2])) + "</td>\
          <td class='editmenu'>\
          <span>"+file_webshell+"<a class='btlink' href='javascript:;' onclick=\"CopyFile('" + rdata.PATH + "/" + fmp[0] + "')\">" + lan.files.file_menu_copy + "</a> | \
          <a class='btlink' href='javascript:;' onclick=\"CutFile('" + rdata.PATH + "/" + fmp[0] + "')\">" + lan.files.file_menu_mv + "</a> | \
          <a class='btlink' href='javascript:;' onclick=\"ReName(0,'" + fmp[0] + "')\">" + lan.files.file_menu_rename + "</a> | \
          <a class='btlink' href=\"javascript:Zip('" + rdata.PATH + "/" + fmp[0] + "');\">" + lan.files.file_menu_zip + "</a> | \
          "+ bodyZip + image_view + download + "\
          <a class='btlink' href='javascript:;' onclick=\"DeleteFile('" + rdata.PATH + "/" + fmp[0] + "')\">" + lan.files.file_menu_del + "</a>\
          </span></td></tr>";
          }
          else {
              Body += "<div class='file folderBox menufile' data-path='" + rdata.PATH + "/" + fmp[0] + "' filetype='" + fmp[0] + "' title='" + lan.files.file_name + "：" + fmp[0] + "&#13;" + lan.files.file_size + "：" + ToSize(fmp[1]) + "&#13;" + lan.files.file_etime + "：" + getLocalTime(fmp[2]) + "'>\
          <input type='checkbox' name='id' value='"+ fmp[0] + "'>\
          <div class='ico ico-"+ (GetExtName(fmp[0])) + "'></div>\
          <div class='titleBox'><span class='tname'>" + fmp[0] + "</span></div>\
          </div>";
          }
      }
      var dirInfo = '(' + lan.files.get_size.replace('{1}', rdata.DIR.length + '').replace('{2}', rdata.FILES.length + '') + '<font id="pathSize"><a class="btlink ml5" onClick="GetPathSize()">' + lan.files.get + '</a></font>)';
      $("#DirInfo").html(dirInfo);
      if (getCookie("rank") === "a") {
          var sort_icon = '<span data-id="status" class="glyphicon glyphicon-triangle-' + ((data['reverse'] !== 'False') ? 'bottom' : 'top') + '" style="margin-left:5px;color:#bbb"></span>';
          var tablehtml = '<div class="newTable"><table width="100%" border="0" cellpadding="0" cellspacing="0" class="table table-hover">\
                            <thead>\
                                <tr>\
                                    <th width="30"><input type="checkbox" id="setBox" placeholder=""></th>\
                                    <th><a style="cursor: pointer;" onclick="GetFiles('+ p + ',\'name\')">' + lan.files.file_name + ((data['sort'] === 'name' || !data['sort']) ? sort_icon : '') + '</a></th>\
                                    <th><a style="cursor: pointer;" onclick="GetFiles('+ p + ',\'size\')">' + lan.files.file_size + ((data['sort'] === 'size') ? sort_icon : '') + '</a></th>\
                                    <th><a style="cursor: pointer;" onclick="GetFiles('+ p + ',\'mtime\')">' + lan.files.file_etime + ((data['sort'] === 'mtime') ? sort_icon : '') + '</a></th>\
                                    <th style="text-align: right;" width="330">'+ lan.files.file_act + '</th>\
                                </tr>\
                            </thead>\
                            </table>\
            </div>\
            <div class="newTableShadow"></div>\
                  <div class="oldTable" style="overflow: auto;height: 500px;margin-top: -8px;"><table width="100%" border="0" cellpadding="0" cellspacing="0" class="table table-hover">\
            <thead>\
              <tr>\
                <th width="30"><input type="checkbox" id="setBox" placeholder=""></th>\
                <th><a style="cursor: pointer;" class="btlink" onclick="GetFiles('+ p + ',\'name\')">' + lan.files.file_name + ((data['sort'] === 'name' || !data['sort']) ? sort_icon : '') + '</a></th>\
                <th><a style="cursor: pointer;" class="btlink" onclick="GetFiles('+ p + ',\'size\')">' + lan.files.file_size + ((data['sort'] === 'size') ? sort_icon : '') + '</a></th>\
                <th><a style="cursor: pointer;" class="btlink" onclick="GetFiles('+ p + ',\'mtime\')">' + lan.files.file_etime + ((data['sort'] === 'mtime') ? sort_icon : '') + '</a></th>\
                <th style="text-align: right;" width="330">'+ lan.files.file_act + '</th>\
              </tr>\
            </thead>\
            <tbody id="filesBody" class="list-list">'+ Body + '</tbody>\
          </table></div><div class="oldTableShadow"></div>';
          $("#fileCon").removeClass("fileList").html(tablehtml);
      }
      else {
          $("#fileCon").addClass("fileList").html(Body);
      }
      $("#DirPathPlace input").val(rdata.PATH);
      fileDrop.init();
      var BarTools = '<div class="btn-group">\
          <button class="btn btn-default btn-sm dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">\
          '+ lan.files.new + ' <span class="caret"></span>\
          </button>\
          <ul class="dropdown-menu">\
          <li><a href="javascript:CreateFile(0,\'' + Path + '\');">' + lan.files.new_empty_file + '</a></li>\
          <li><a href="javascript:CreateDir(0,\'' + Path + '\');">' + lan.files.new_dir + '</a></li>\
          </ul>\
          </div>';
      if (rdata.PATH != '/') {
          BarTools += ' <button onclick="javascript:BackDir();" class="btn btn-default btn-sm glyphicon glyphicon-arrow-left" title="' + lan.files.return + '"></button>';
      }
      setCookie('Path', rdata.PATH);
      BarTools += ' <button onclick="javascript:GetFiles(\'' + rdata.PATH + '\');" class="btn btn-default btn-sm glyphicon glyphicon-refresh" title="' + lan.public.fresh + '"></button>';
      
      var copyName = getCookie('copyFileName');
      var cutName = getCookie('cutFileName');
      var isPaste = (copyName == 'null') ? cutName : copyName;
      if (isPaste != 'null' && isPaste != undefined) {
          BarTools += ' <button onclick="javascript:PasteFile(\'' + (GetFileName(isPaste)) + '\');" class="btn btn-default btn-Warning btn-sm">' + lan.files.paste + '</button>';
      }

      $("#Batch").html('');
      var BatchTools = '';
      var isBatch = getCookie('BatchSelected');
      if (isBatch == 1 || isBatch == '1') {
          BatchTools += ' <button onclick="javascript:BatchPaste();" class="btn btn-default btn-sm">' + lan.files.paste_all + '</button>';
      }

      $("#Batch").html(BatchTools);
      $("#setBox").prop("checked", false);

      $("#BarTools").html(BarTools);
      $(".oldTable").scrollTop(old_scroll_top);
      $("input[name=id]").click(function () {
          if ($(this).prop("checked")) {
              $(this).prop("checked", true);
              $(this).parents("tr").addClass("ui-selected");
          }
          else {
              $(this).prop("checked", false);
              $(this).parents("tr").removeClass("ui-selected");
          }
          showSeclect()
      });

      $("#setBox").click(function () {
          if ($(this).prop("checked")) {
              $("input[name=id]").prop("checked", true);
              $("#filesBody > tr").addClass("ui-selected");

          } else {
              $("input[name=id]").prop("checked", false);
              $("#filesBody > tr").removeClass("ui-selected");
          }
          showSeclect();
      });

      $("#filesBody .btlink").click(function (e) {
          e.stopPropagation();
      });
      $("input[name=id]").dblclick(function (e) {
          e.stopPropagation();
      });
      $("#filesBody").bind("contextmenu", function (e) {
          return false;
      });
      bindselect();
      $("#filesBody").mousedown(function (e) {
          var count = totalFile();
          if (e.which == 3) {
              if (count > 1) {
                  RClickAll(e);
              }
              else {
                  return
              }
          }
      });
      $(".folderBox,.folderBoxTr").mousedown(function (e) {
          var count = totalFile();
          if (e.which == 3) {
              if (count <= 1) {
                  var a = $(this);
                  a.contextify(RClick(a.attr("filetype"), a.attr("data-path"), a.find("input").val(), rdata,a.attr('fileshare'),a.attr('data-composer')));
                  $(this).find('input').prop("checked", true);
                  $(this).addClass('ui-selected');
                  $(this).siblings().removeClass('ui-selected').find('input').prop("checked", false);
              }
              else {
                  RClickAll(e);
              }
          }
      });
      // 条数改变时从第一页开始
      $(".showRow").change(function () {
          setCookie('showRow', $(this).val());
          GetFiles(1);
      });
      PathPlaceBtn(rdata.PATH);
      auto_table_width();
  });
}
// 新建空白文件
function CreateFile(type, path) {
  if (type == 1) {
      var fileName = $("#newFileName").val();
      layer.msg(lan.public.the, { icon: 16, time: 10000 });
      $.post('/files?action=CreateFile', 'path=' + encodeURIComponent(path + '/' + fileName), function (rdata) {
          layer.close(getCookie('layers'));
          layer.msg(rdata.msg, { icon: rdata.status ? 1 : 2 });
          if (rdata.status) {
              GetFiles($("#DirPathPlace input").val());
              openEditorView(0, path + '/' + fileName);
          }
      });
      return;
  }
  var layers = layer.open({
      type: 1,
      shift: 5,
      closeBtn: 2,
      area: '320px',
      title: lan.files.new_empty_file,
      content: '<div class="bt-form pd20 pb70">\
        <div class="line">\
        <input type="text" class="bt-input-text" name="Name" id="newFileName" value="" placeholder="'+ lan.files.file_name + '" style="width:100%" />\
        </div>\
        <div class="bt-form-submit-btn">\
        <button type="button" class="btn btn-danger btn-sm layer_close">'+ lan.public.close + '</button>\
        <button id="CreateFileBtn" type="button" class="btn btn-success btn-sm" onclick="CreateFile(1,\'' + path + '\')">' + lan.files.new + '</button>\
        </div>\
      </div>',
      success: function (layers, index) {
          $('.layer_close').click(function () {
              layer.close(index);
          });
      }
  });
  setCookie('layers', layers);
  $("#newFileName").focus().keyup(function (e) {
      if (e.keyCode == 13) $("#CreateFileBtn").click();
  });
}
// 新建目录
function CreateDir(type, path) {
  if (type == 1) {
      var dirName = $("#newDirName").val();
      layer.msg(lan.public.the, {
          icon: 16,
          time: 10000
      });
      $.post('/files?action=CreateDir', 'path=' + encodeURIComponent(path + '/' + dirName), function (rdata) {
          layer.close(getCookie('layers'));
          layer.msg(rdata.msg, { icon: rdata.status ? 1 : 2 });
          GetFiles($("#DirPathPlace input").val());
      });
      return;
  }
  var layers = layer.open({
      type: 1,
      shift: 5,
      closeBtn: 2,
      area: '320px',
      title: lan.files.new_dir,
      content: '<div class="bt-form pd20 pb70">\
        <div class="line">\
        <input type="text" class="bt-input-text" name="Name" id="newDirName" value="" placeholder="'+ lan.files.dir_name + '" style="width:100%" />\
        </div>\
        <div class="bt-form-submit-btn">\
        <button type="button" class="btn btn-danger btn-sm btn-title layer_close">'+ lan.public.close + '</button>\
        <button type="button" id="CreateDirBtn" class="btn btn-success btn-sm btn-title" onclick="CreateDir(1,\'' + path + '\')">' + lan.files.new + '</button>\
        </div>\
      </div>',
      success: function (layers, index) {
          $('.layer_close').click(function () {
              layer.close(index);
          });
      }
  });
  setCookie('layers', layers);
  $("#newDirName").focus().keyup(function (e) {
      if (e.keyCode == 13) $("#CreateDirBtn").click();
  });
}
// 新建目录
function CreateFolder() {
	var a = "<tr><td colspan='2'><span class='glyphicon glyphicon-folder-open'></span> <input id='newFolderName' class='newFolderName' type='text' value=''></td><td colspan='3'><button id='nameOk' type='button' class='btn btn-success btn-sm'>"+lan.public.ok+"</button>&nbsp;&nbsp;<button id='nameNOk' type='button' class='btn btn-default btn-sm'>"+lan.public.cancel+"</button></td></tr>";
	if($("#tbody tr").length == 0) {
		$("#tbody").append(a)
	} else {
		$("#tbody tr:first-child").before(a)
	}
	$(".newFolderName").focus();
	$("#nameOk").click(function() {
		var c = $("#newFolderName").val();
		var b = $("#PathPlace").find("span").text();
		newTxt = b.replace(new RegExp(/(\/\/)/g), "/") + c;
		var d = "path=" + newTxt;
		$.post("/files?action=CreateDir", d, function(e) {
			if(e.status == true) {
				layer.msg(e.msg, {
					icon: 1
				})
			} else {
				layer.msg(e.msg, {
					icon: 2
				})
			}
			GetDiskList(b)
		})
	});
	$("#nameNOk").click(function() {
		$(this).parents("tr").remove()
	})
}
// 删除文件
function DeleteFile(fileName) {
  layer.confirm(lan.get('recycle_bin_confirm', [fileName]), { title: lan.files.del_file, closeBtn: 2, icon: 3 }, function (index) {
      layer.msg(lan.public.the, { icon: 16, time: 0, shade: [0.3, '#000'] });
      $.post('/files?action=DeleteFile', 'path=' + encodeURIComponent(fileName), function (rdata) {
          layer.close(index);
          layer.msg(rdata.msg, { icon: rdata.status ? 1 : 2 });
          GetFiles($("#DirPathPlace input").val());
      });
  });
}
// 删除目录
function DeleteDir(dirName) {
  layer.confirm(lan.get('recycle_bin_confirm_dir', [dirName]), { title: lan.files.del_dir, closeBtn: 2, icon: 3 }, function (index) {
      layer.msg(lan.public.the, { icon: 16, time: 0, shade: [0.3, '#000'] });
      $.post('/files?action=DeleteDir', 'path=' + encodeURIComponent(dirName), function (rdata) {
          layer.close(index);
          layer.msg(rdata.msg, { icon: rdata.status ? 1 : 2 });
          GetFiles($("#DirPathPlace input").val());
      });
  });
}
// 重命名或剪切粘贴
function ReName(type, fileName) {
  if (type == 1) {
      var path = $("#DirPathPlace input").val();
      var newFileName = encodeURIComponent(path + '/' + $("#newFileName").val());
      var oldFileName = encodeURIComponent(path + '/' + fileName);
      layer.msg(lan.public.the, { icon: 16, time: 10000 });
      $.post('/files?action=MvFile', 'sfile=' + oldFileName + '&dfile=' + newFileName + '&rename=true', function (rdata) {
          layer.close(getCookie('layers'));
          layer.msg(rdata.msg, { icon: rdata.status ? 1 : 2 });
          GetFiles(path);
      });
      return;
  }
  var layers = layer.open({
      type: 1,
      shift: 5,
      closeBtn: 2,
      area: '320px',
      title: lan.files.file_menu_rename,
      content: '<div class="bt-form pd20 pb70">\
      <div class="line">\
      <input type="text" class="bt-input-text" name="Name" id="newFileName" value="' + fileName + '" placeholder="' + lan.files.file_name + '" style="width:100%" />\
      </div>\
      <div class="bt-form-submit-btn">\
      <button type="button" class="btn btn-danger btn-sm btn-title layers_close">'+ lan.public.close + '</button>\
      <button type="button" id="ReNameBtn" class="btn btn-success btn-sm btn-title" onclick="ReName(1,\'' + fileName.replace(/'/, "\\'") + '\')">' + lan.public.save + '</button>\
      </div>\
    </div>',
      success: function (layers, index) {
          $('.layers_close').click(function () {
              layer.close(index);
          });
      }
  });
  setCookie('layers', layers);
  $("#newFileName").focus().keyup(function (e) {
      if (e.keyCode == 13) $("#ReNameBtn").click();
  });
}
// 粘贴（先判断此路径有无重复文件）
function PasteFile(fileName) {
  var path = $("#DirPathPlace input").val();
  var copyName = getCookie('copyFileName');
  var cutName = getCookie('cutFileName');
  var filename = copyName;
  if (cutName != 'null' && cutName != undefined) filename = cutName;
  filename = filename.split('/').pop();
  $.post('/files?action=CheckExistsFiles', { dfile: path, filename: filename }, function (result) {
      if (result.length > 0) {
          var tbody = '';
          for (var i = 0; i < result.length; i++) {
              tbody += '<tr><td>' + result[i].filename + '</td><td>' + ToSize(result[i].size) + '</td><td>' + getLocalTime(result[i].mtime) + '</td></tr>';
          }
          var mbody = '<div class="divtable"><table class="table table-hover" width="100%" border="0" cellpadding="0" cellspacing="0"><thead><th>文件名</th><th>大小</th><th>最后修改时间</th></thead>\
          <tbody>'+ tbody + '</tbody>\
          </table></div>';
          SafeMessage('即将覆盖以下文件', mbody, function () {
              PasteTo(path, copyName, cutName, fileName);
          });
      } else {
          PasteTo(path, copyName, cutName, fileName);
      }
  });
}
// 粘贴（实际执行）
function PasteTo(path, copyName, cutName, fileName) {
  // 复制粘贴
  if (copyName != 'null' && copyName != undefined) {
      layer.msg(lan.files.copy_the, {
          icon: 16,
          time: 0, shade: [0.3, '#000']
      });
      $.post('/files?action=CopyFile', 'sfile=' + encodeURIComponent(copyName) + '&dfile=' + encodeURIComponent(path + '/' + fileName), function (rdata) {
          layer.closeAll();
          layer.msg(rdata.msg, {
              icon: rdata.status ? 1 : 2
          });
          GetFiles(path);
      });
      setCookie('copyFileName', null);
      setCookie('cutFileName', null);
      return;
  }
  // 重命名或剪切粘贴
  if (cutName != 'null' && cutName != undefined) {
      layer.msg(lan.files.mv_the, {
          icon: 16,
          time: 0, shade: [0.3, '#000']
      });
      $.post('/files?action=MvFile', 'sfile=' + encodeURIComponent(cutName) + '&dfile=' + encodeURIComponent(path + '/' + fileName), function (rdata) {
          layer.closeAll();
          layer.msg(rdata.msg, {
              icon: rdata.status ? 1 : 2
          });
          GetFiles(path);
      });
      setCookie('copyFileName', null);
      setCookie('cutFileName', null);
  }
}
// 批量操作
function Batch(type, access) {
  var path = $("#DirPathPlace input").val();
  var el = document.getElementsByTagName('input');
  var len = el.length;
  var data = 'path=' + path + '&type=' + type;
  var name = 'data';
  var datas = []
  var oldType = getCookie('BatchPaste');
  for (var i = 0; i < len; i++) {
      if (el[i].checked == true && el[i].value != 'on') {
          datas.push(el[i].value)
      }
  }
  data += "&data=" + encodeURIComponent(JSON.stringify(datas))
  if (type < 3) setCookie('BatchSelected', '1');
  setCookie('BatchPaste', type);
  if (access == 1) {
      var access = $("#access").val();
      var chown = $("#chown").val();
      var all = $("#accept_all").prop("checked") ? 'True' : 'False';
      data += '&access=' + access + '&user=' + chown + "&all=" + all;
      layer.closeAll();
  }
  if (type == 4) {
      AllDeleteFileSub(data, path);
      setCookie('BatchPaste', oldType);
      return;
  }
  if (type == 5) {
      var names = '';
      for (var i = 0; i < len; i++) {
          if (el[i].checked == true && el[i].value != 'on') {
              names += el[i].value + ',';
          }
      }
      Zip(names);
      return;
  }
  if(type == 6){
    webshell_dir()
  }
  myloadT = layer.msg("<div class='myspeed'>" + lan.public.the + "</div>", { icon: 16, time: 0, shade: [0.3, '#000'] });
  $.post('/files?action=SetBatchData', data, function (rdata) {
      layer.close(myloadT);
      if (rdata.status === false) {
          setCookie('BatchSelected', null);
      }
      layer.msg(rdata.msg, { icon: rdata.status ? 1 : 2 });
      GetFiles(path);
  });
}
// 批量操作文件判断
function BatchPaste() {
  var path = $("#DirPathPlace input").val();
  var type = getCookie('BatchPaste');
  var data = 'type=' + type + '&path=' + path;

  $.post('/files?action=CheckExistsFiles', { dfile: path }, function (result) {
      if (result.length > 0) {
          var tbody = '';
          for (var i = 0; i < result.length; i++) {
              tbody += '<tr><td>' + result[i].filename + '</td><td>' + ToSize(result[i].size) + '</td><td>' + getLocalTime(result[i].mtime) + '</td></tr>';
          }
          var mbody = '<div class="divtable" style="height: 395px;overflow: auto;border: #ddd 1px solid;position: relative;"><table class="table table-hover" width="100%" border="0" cellpadding="0" cellspacing="0"><thead><th>文件名</th><th>大小</th><th>最后修改时间</th></thead>\
          <tbody>'+ tbody + '</tbody>\
          </table></div>';
          SafeMessage('即将覆盖以下文件', mbody, function () {
              BatchPasteTo(data, path);
          });
          $(".layui-layer-page").css("width", "500px");
      } else {
          BatchPasteTo(data, path);
      }
  });
}
// 批量操作文件
function BatchPasteTo(data, path) {
  myloadT = layer.msg("<div class='myspeed'>" + lan.public.the + "</div>", { icon: 16, time: 0, shade: [0.3, '#000'] });
  $.post('files?action=BatchPaste', data, function (rdata) {
      layer.close(myloadT);
      setCookie('BatchSelected', null);
      GetFiles(path);
      layer.msg(rdata.msg, { icon: 1 });
  });
}
function AllDeleteFileSub(data, path) {
  layer.confirm(lan.files.del_all_msg, { title: lan.files.del_all_file, closeBtn: 2, icon: 3 }, function (index) {
      layer.msg("<div class='myspeed'>" + lan.public.the + "</div>", { icon: 16, time: 0, shade: [0.3, '#000'] });
      $.post('files?action=SetBatchData', data, function (rdata) {
          layer.close(index);
          GetFiles(path);
          layer.msg(rdata.msg, { icon: 1 });
      });
  });
}
// 回收站文件渲染
function Recycle_bin(type) {
  $.post('/files?action=Get_Recycle_bin','',function (rdata) {
      if(rdata.status === false) {
        layer.msg(rdata.msg, { icon: 2 });
          return false;
      }
      var body = '';
      switch (type) {
          case 1:
              for (var i = 0; i < rdata.dirs.length; i++) {
                  var shortwebname = rdata.dirs[i].name.replace(/'/, "\\'");
                  var shortpath = rdata.dirs[i].dname;
                  if (shortwebname.length > 20) shortwebname = shortwebname.substring(0, 20) + "...";
                  if (shortpath.length > 20) shortpath = shortpath.substring(0, 20) + "...";
                  body += '<tr>\
              <td><span class=\'ico ico-folder\'></span><span class="tname" title="'+ rdata.dirs[i].name + '">' + shortwebname + '</span></td>\
              <td><span title="'+ rdata.dirs[i].dname + '">' + shortpath + '</span></td>\
              <td>'+ ToSize(rdata.dirs[i].size) + '</td>\
              <td>'+ getLocalTime(rdata.dirs[i].time) + '</td>\
              <td style="text-align: right;">\
                <a class="btlink" href="javascript:;" onclick="ReRecycleBin(\'' + rdata.dirs[i].rname.replace(/'/, "\\'") + '\',this)">' + lan.files.recycle_bin_re + '</a>\
                 | <a class="btlink" href="javascript:;" onclick="DelRecycleBin(\'' + rdata.dirs[i].rname.replace(/'/, "\\'") + '\',this)">' + lan.files.recycle_bin_del + '</a>\
              </td>\
            </tr>';
              }
              for (var i = 0; i < rdata.files.length; i++) {
                  if (rdata.files[i].name.indexOf('BTDB_') != -1) {
                      var shortwebname = rdata.files[i].name.replace(/'/, "\\'");
                      var shortpath = rdata.files[i].dname;
                      if (shortwebname.length > 20) shortwebname = shortwebname.substring(0, 20) + "...";
                      if (shortpath.length > 20) shortpath = shortpath.substring(0, 20) + "...";
                      body += '<tr>\
              <td><span class="ico ico-'+ (GetExtName(rdata.files[i].name)) + '"></span><span class="tname" title="' + rdata.files[i].name + '">' + shortwebname.replace('BTDB_', '') + '</span></td>\
              <td><span title="'+ rdata.files[i].dname + '">mysql://' + shortpath.replace('BTDB_', '') + '</span></td>\
              <td>-</td>\
              <td>'+ getLocalTime(rdata.files[i].time) + '</td>\
              <td style="text-align: right;">\
                <a class="btlink" href="javascript:;" onclick="ReRecycleBin(\'' + rdata.files[i].rname.replace(/'/, "\\'") + '\',this)">' + lan.files.recycle_bin_re + '</a>\
                 | <a class="btlink" href="javascript:;" onclick="DelRecycleBin(\'' + rdata.files[i].rname.replace(/'/, "\\'") + '\',this)">' + lan.files.recycle_bin_del + '</a>\
              </td>\
            </tr>'

                      continue;
                  }
                  var shortwebname = rdata.files[i].name.replace(/'/, "\\'");
                  var shortpath = rdata.files[i].dname;
                  if (shortwebname.length > 20) shortwebname = shortwebname.substring(0, 20) + "...";
                  if (shortpath.length > 20) shortpath = shortpath.substring(0, 20) + "...";
                  body += '<tr>\
              <td><span class="ico ico-'+ (GetExtName(rdata.files[i].name)) + '"></span><span class="tname" title="' + rdata.files[i].name + '">' + shortwebname + '</span></td>\
              <td><span title="'+ rdata.files[i].dname + '">' + shortpath + '</span></td>\
              <td>'+ ToSize(rdata.files[i].size) + '</td>\
              <td>'+ getLocalTime(rdata.files[i].time) + '</td>\
              <td style="text-align: right;">\
                <a class="btlink" href="javascript:;" onclick="ReRecycleBin(\'' + rdata.files[i].rname.replace(/'/, "\\'") + '\',this)">' + lan.files.recycle_bin_re + '</a>\
                 | <a class="btlink" href="javascript:;" onclick="DelRecycleBin(\'' + rdata.files[i].rname.replace(/'/, "\\'") + '\',this)">' + lan.files.recycle_bin_del + '</a>\
              </td>\
            </tr>'
              }
              $("#RecycleBody").html(body);
              return;
              break;
          case 2:
              for (var i = 0; i < rdata.dirs.length; i++) {
                  var shortwebname = rdata.dirs[i].name.replace(/'/, "\\'");
                  var shortpath = rdata.dirs[i].dname;
                  if (shortwebname.length > 20) shortwebname = shortwebname.substring(0, 20) + "...";
                  if (shortpath.length > 20) shortpath = shortpath.substring(0, 20) + "...";
                  body += '<tr>\
              <td><span class=\'ico ico-folder\'></span><span class="tname" title="'+ rdata.dirs[i].name + '">' + shortwebname + '</span></td>\
              <td><span title="'+ rdata.dirs[i].dname + '">' + shortpath + '</span></td>\
              <td>'+ ToSize(rdata.dirs[i].size) + '</td>\
              <td>'+ getLocalTime(rdata.dirs[i].time) + '</td>\
              <td style="text-align: right;">\
                <a class="btlink" href="javascript:;" onclick="ReRecycleBin(\'' + rdata.dirs[i].rname.replace(/'/, "\\'") + '\',this)">' + lan.files.recycle_bin_re + '</a>\
                 | <a class="btlink" href="javascript:;" onclick="DelRecycleBin(\'' + rdata.dirs[i].rname.replace(/'/, "\\'") + '\',this)">' + lan.files.recycle_bin_del + '</a>\
              </td>\
            </tr>'
              }
              $("#RecycleBody").html(body);
              return;
              break;
          case 3:
              for (var i = 0; i < rdata.files.length; i++) {
                  if (rdata.files[i].name.indexOf('BTDB_') != -1) continue;
                  var shortwebname = rdata.files[i].name.replace(/'/, "\\'");
                  var shortpath = rdata.files[i].dname;
                  if (shortwebname.length > 20) shortwebname = shortwebname.substring(0, 20) + "...";
                  if (shortpath.length > 20) shortpath = shortpath.substring(0, 20) + "...";
                  body += '<tr>\
              <td><span class="ico ico-'+ (GetExtName(rdata.files[i].name)) + '"></span><span class="tname" title="' + rdata.files[i].name + '">' + shortwebname + '</span></td>\
              <td><span title="'+ rdata.files[i].dname + '">' + shortpath + '</span></td>\
              <td>'+ ToSize(rdata.files[i].size) + '</td>\
              <td>'+ getLocalTime(rdata.files[i].time) + '</td>\
              <td style="text-align: right;">\
                <a class="btlink" href="javascript:;" onclick="ReRecycleBin(\'' + rdata.files[i].rname.replace(/'/, "\\'") + '\',this)">' + lan.files.recycle_bin_re + '</a>\
                 | <a class="btlink" href="javascript:;" onclick="DelRecycleBin(\'' + rdata.files[i].rname.replace(/'/, "\\'") + '\',this)">' + lan.files.recycle_bin_del + '</a>\
              </td>\
            </tr>'
              }
              $("#RecycleBody").html(body);
              return;
              break;
          case 4:
              for (var i = 0; i < rdata.files.length; i++) {
                  if (ReisImage(getFileName(rdata.files[i].name))) {
                      var shortwebname = rdata.files[i].name.replace(/'/, "\\'");
                      var shortpath = rdata.files[i].dname;
                      if (shortwebname.length > 20) shortwebname = shortwebname.substring(0, 20) + "...";
                      if (shortpath.length > 20) shortpath = shortpath.substring(0, 20) + "...";
                      body += '<tr>\
              <td><span class="ico ico-'+ (GetExtName(rdata.files[i].name)) + '"></span><span class="tname" title="' + rdata.files[i].name + '">' + shortwebname + '</span></td>\
              <td><span title="'+ rdata.files[i].dname + '">' + shortpath + '</span></td>\
              <td>'+ ToSize(rdata.files[i].size) + '</td>\
              <td>'+ getLocalTime(rdata.files[i].time) + '</td>\
              <td style="text-align: right;">\
                <a class="btlink" href="javascript:;" onclick="ReRecycleBin(\'' + rdata.files[i].rname.replace(/'/, "\\'") + '\',this)">' + lan.files.recycle_bin_re + '</a>\
                 | <a class="btlink" href="javascript:;" onclick="DelRecycleBin(\'' + rdata.files[i].rname.replace(/'/, "\\'") + '\',this)">' + lan.files.recycle_bin_del + '</a>\
              </td>\
            </tr>'
                  }
              }
              $("#RecycleBody").html(body);
              return;
              break;
      }
      var tablehtml = '<div class="re-head">\
      <div class="ss-text">\
                      <em>'+ lan.files.recycle_bin_on + '</em>\
              </div>\
      <span>'+ lan.files.recycle_bin_ps + '</span>\
              <button style="float: right" class="btn btn-default btn-sm" onclick="CloseRecycleBin();">'+ lan.files.recycle_bin_close + '</button>\
      </div>\
      <div class="re-con">\
        <div class="re-con-menu">\
          <p class="on" onclick="Recycle_bin(1)">'+ lan.files.recycle_bin_type1 + '</p>\
          <p onclick="Recycle_bin(2)">'+ lan.files.recycle_bin_type2 + '</p>\
          <p onclick="Recycle_bin(3)">'+ lan.files.recycle_bin_type3 + '</p>\
          <p onclick="Recycle_bin(4)">'+ lan.files.recycle_bin_type4 + '</p>\
        </div>\
        <div class="re-con-con">\
        <div style="margin: 15px;" class="divtable">\
        <table width="100%" class="table table-hover">\
          <thead>\
            <tr>\
              <th>'+ lan.files.recycle_bin_th1 + '</th>\
              <th>'+ lan.files.recycle_bin_th2 + '</th>\
              <th>'+ lan.files.recycle_bin_th3 + '</th>\
              <th width="150">'+ lan.files.recycle_bin_th4 + '</th>\
              <th style="text-align: right;" width="110">'+ lan.files.recycle_bin_th5 + '</th>\
            </tr>\
          </thead>\
        <tbody id="RecycleBody" class="list-list">'+ body + '</tbody>\
    </table></div></div></div>';
      if (type == "open") {
          layer.open({
              type: 1,
              shift: 5,
              closeBtn: 2,
              area: ['80%', '606px'],
              title: lan.files.recycle_bin_title,
              content: tablehtml
          });
          Recycle_bin(1);
      }
      $(".re-con-menu p").click(function () {
          $(this).addClass("on").siblings().removeClass("on");
      })
  });
}
// 回收站文件恢复
function ReRecycleBin(path, obj) {
  layer.confirm(lan.files.recycle_bin_re_msg, { title: lan.files.recycle_bin_re_title, closeBtn: 2, icon: 3 }, function () {
      var loadT = layer.msg(lan.files.recycle_bin_re_the, { icon: 16, time: 0, shade: [0.3, '#000'] });
      $.post('/files?action=Re_Recycle_bin', 'path=' + encodeURIComponent(path), function (rdata) {
          layer.close(loadT);
          layer.msg(rdata.msg, { icon: rdata.status ? 1 : 5 });
          if (rdata.status === true) {
            $(obj).parents('tr').remove();
          }
      });
  });
}
// 回收站文件删除
function DelRecycleBin(path, obj) {
  layer.confirm(lan.files.recycle_bin_del_msg, { title: lan.files.recycle_bin_del_title, closeBtn: 2, icon: 3 }, function () {
      var loadT = layer.msg(lan.files.recycle_bin_del_the, { icon: 16, time: 0, shade: [0.3, '#000'] });
      $.post('/files?action=Del_Recycle_bin', 'path=' + encodeURIComponent(path), function (rdata) {
          layer.close(loadT);
          layer.msg(rdata.msg, { icon: rdata.status ? 1 : 5 });
          if (rdata.status === true) {
            $(obj).parents('tr').remove();
          } 
      });
  });
}
// 清空回收站
function CloseRecycleBin() {
  layer.confirm(lan.files.recycle_bin_close_msg, { title: lan.files.recycle_bin_close, closeBtn: 2, icon: 3 }, function () {
      var loadT = layer.msg("<div class='myspeed'>" + lan.files.recycle_bin_close_the + "</div>", { icon: 16, time: 0, shade: [0.3, '#000'] });
      $.post('/files?action=Close_Recycle_bin', '', function (rdata) {
          layer.close(loadT);
          layer.msg(rdata.msg, { icon: rdata.status ? 1 : 5 });
          if (rdata.status === true) {
            $("#RecycleBody").html('')
          } 
      });
  });
}
// 文件下载接口
function GetFileBytes(fileName, fileSize) {
  window.open('/download?filename=' + encodeURIComponent(fileName));
}
// 获取目录视频列表
function GetPlay(fileName) {
  var old_filename = fileName;
  var imgUrl = '/download?filename=' + fileName;
  var p_tmp = fileName.split('/')
  var path = p_tmp.slice(0, p_tmp.length - 1).join('/')
  layer.open({
      type: 1,
      closeBtn: 2,
      // maxmin:true,
      title: '正在播放[<a class="btvideo-title">' + p_tmp[p_tmp.length-1] + '</a>]',
      area: ["890px","402px"],
      shadeClose: false,
      skin:'movie_pay',
      content: '<div id="btvideo"><video type="" src="' + imgUrl + '&play=true" data-filename="'+ fileName +'" controls="controls" autoplay="autoplay" width="640" height="360">\
                  您的浏览器不支持 video 标签。\
                  </video></div><div class="video-list"></div>',
      success: function () {
          $.post('/files?action=get_videos', { path: path }, function (rdata) {
              var video_list = '<table class="table table-hover" style=""><thead style="display: none;"><tr><th style="word-break: break-all;word-wrap:break-word;width:165px;">文件名</th><th style="width:65px" style="text-align:right;">大小</th></tr></thead>';
              for (var i = 0; i < rdata.length; i++) {
                  var filename = path + '/' + rdata[i].name
                  video_list += '<tr class="' + ((filename === old_filename) ? 'video-avt' :'') + '"><td style="word-break: break-all;word-wrap:break-word;width:150px" onclick="play_file(this,\'' + filename + '\')" title="文件: ' + filename + '\n类型: ' + rdata[i].type + '"><a>'
                      + rdata[i].name + '</a></td><td style="font-size: 8px;text-align:right;width:65px;">' + ToSize(rdata[i].size) + '</td></tr>';
              }
              video_list += '</table>';
              $('.video-list').html(video_list);
          });
      }
  });
}
// 压缩文件
function Zip(dirName, submits) {
  var path = $("#DirPathPlace input").val();
  if (submits != undefined) {
      if (dirName.indexOf(',') == -1) {
          tmp = $("#sfile").val().split('/');
          sfile = encodeURIComponent(tmp[tmp.length - 1]);
      } else {
          sfile = encodeURIComponent(dirName);
      }
      dfile = encodeURIComponent($("#dfile").val());
      var z_type = $("select[name='z_type']").val();
      if (!z_type) z_type = 'tar.gz';
      layer.close(getCookie('layers'));
      var layers = layer.msg(lan.files.zip_the, { icon: 16, time: 0, shade: [0.3, '#000'] });
      $.post('/files?action=Zip', 'sfile=' + sfile + '&dfile=' + dfile + '&z_type=' + z_type + '&path=' + encodeURIComponent(path), function (rdata) {
          layer.close(layers);
          if (rdata == null || rdata == undefined) {
              layer.msg(lan.files.zip_ok, { icon: 1 });
              GetFiles(path)
              ReloadFiles();
              return;
          }
          layer.msg(rdata.msg, { icon: rdata.status ? 1 : 2 });
          if (rdata.status) {
              GetFiles(path);
          }
      });
      return
  }
  param = dirName;
  if (dirName.indexOf(',') != -1) {
      tmp = path.split('/')
      dirName = path + '/' + tmp[tmp.length - 1]
  }
  var layers = layer.open({
      type: 1,
      shift: 5,
      closeBtn: 2,
      area: '650px',
      title: lan.files.zip_title,
      content: '<div class="bt-form pd20 pb70">'
          + '<div class="line noborder">'
          + '<input type="text" class="form-control" id="sfile" value="' + param + '" placeholder="" style="display:none" />'
          + '<p style="margin-bottom: 10px;"><span>压缩类型</span><select style="margin-left: 8px;" class="bt-input-text" name="z_type"><option value="tar.gz">tar.gz (推荐)</option><option value="zip">zip (通用格式)</option><option value="rar">rar (WinRAR对中文兼容较好)</option></select></p>'
          + '<span>' + lan.files.zip_to + '</span><input type="text" class="bt-input-text" id="dfile" value="' + dirName + '.tar.gz" placeholder="' + lan.files.zip_to + '" style="width: 75%; display: inline-block; margin: 0px 10px 0px 20px;" /><span class="glyphicon glyphicon-folder-open cursor" onclick="ChangePath(\'dfile\')"></span>'
          + '</div>'
          + '<div class="bt-form-submit-btn">'
          + '<button type="button" class="btn btn-danger btn-sm btn-title layer_close">' + lan.public.close + '</button>'
          + '<button type="button" id="ReNameBtn" class="btn btn-success btn-sm btn-title" onclick="Zip(\'' + param + '\',1)">' + lan.files.file_menu_zip + '</button>'
          + '</div>'
          + '</div>',
      success: function (layers, index) {
          $('.layer_close').click(function () {
              layer.close(index);
          });
      }
  });
  setCookie('layers', layers);
  setTimeout(function () {
      $("select[name='z_type']").change(function () {
          var z_type = $(this).val();
          dirName = dirName.replace("tar.gz", z_type)
          $("#dfile").val(dirName + '.' + z_type);
      });
  }, 100);

}
// 解压文件
function UnZip(fileName, type) {
  var path = $("#DirPathPlace input").val();
  if (type.length == 3) {
      var sfile = encodeURIComponent($("#sfile").val());
      var dfile = encodeURIComponent($("#dfile").val());
      var password = encodeURIComponent($("#unpass").val());
      coding = $("select[name='coding']").val();
      layer.close(getCookie('layers'));
      layer.msg(lan.files.unzip_the, { icon: 16, time: 0, shade: [0.3, '#000'] });
      $.post('/files?action=UnZip', 'sfile=' + sfile + '&dfile=' + dfile + '&type=' + type + '&coding=' + coding + '&password=' + password, function (rdata) {
          layer.msg(rdata.msg, { icon: rdata.status ? 1 : 2 });
          GetFiles(path);
      });
      return
  }

  type = (type == 1) ? 'tar' : 'zip'
  var umpass = '';
  if (type == 'zip') {
      umpass = '<div class="line"><span class="tname">' + lan.files.zip_pass_title + '</span><input type="text" class="bt-input-text" id="unpass" value="" placeholder="' + lan.files.zip_pass_msg + '" style="width:330px" /></div>'
  }
  var layers = layer.open({
      type: 1,
      shift: 5,
      closeBtn: 2,
      area: '490px',
      title: lan.files.unzip_title,
      content: '<div class="bt-form pd20 pb70">'
          + '<div class="line unzipdiv">'
          + '<span class="tname">' + lan.files.unzip_name + '</span><input type="text" class="bt-input-text" id="sfile" value="' + fileName + '" placeholder="' + lan.files.unzip_name_title + '" style="width:330px" /></div>'
          + '<div class="line"><span class="tname">' + lan.files.unzip_to + '</span><input type="text" class="bt-input-text" id="dfile" value="' + path + '" placeholder="' + lan.files.unzip_to + '" style="width:330px" /></div>' + umpass
          + '<div class="line"><span class="tname">' + lan.files.unzip_coding + '</span><select class="bt-input-text" name="coding">'
          + '<option value="UTF-8">UTF-8</option>'
          + '<option value="gb18030">GBK</option>'
          + '</select>'
          + '</div>'
          + '<div class="bt-form-submit-btn">'
          + '<button type="button" class="btn btn-danger btn-sm btn-title layer_close">' + lan.public.close + '</button>'
          + '<button type="button" id="ReNameBtn" class="btn btn-success btn-sm btn-title" onclick="UnZip(\'' + fileName + '\',\'' + type + '\')">' + lan.files.file_menu_unzip + '</button>'
          + '</div>'
          + '</div>',
      success: function (layers, index) {
          $('.layer_close').click(function () {
              layer.close(index);
          });
      }
  });
  setCookie('layers', layers);
}
// 改变路径
function ChangePath(d) {
	setCookie("SetId", d);
	setCookie("SetName", "");
	var c = layer.open({
		type: 1,
		area: "650px",
		title: lan.bt.dir,
		closeBtn: 2,
		shift: 5,
		shadeClose: false,
		content: "<div class='changepath'><div class='path-top'><button type='button' class='btn btn-default btn-sm' onclick='BackFile()'><span class='glyphicon glyphicon-share-alt'></span> "+lan.public.return+"</button><div class='place' id='PathPlace'>"+lan.bt.path+"：<span></span></div></div><div class='path-con'><div class='path-con-left'><dl><dt id='changecomlist'></dt></dl></div><div class='path-con-right'><ul class='default' id='computerDefautl'></ul><div class='file-list divtable'><table class='table table-hover' style='border:0 none'><thead><tr class='file-list-head'><th width='20%'>"+lan.bt.filename+"</th><th width='30%'>"+lan.bt.etime+"</th><th width='20%'></th></tr></thead><tbody id='tbody' class='list-list'></tbody></table></div></div></div></div><div class='getfile-btn' style='margin-top:0'><button type='button' class='btn btn-default btn-sm pull-left' onclick='CreateFolder()'>"+lan.bt.adddir+"</button><button type='button' class='btn btn-danger btn-sm mr5' onclick=\"layer.close(getCookie('ChangePath'))\">"+lan.public.close+"</button> <button type='button' class='btn btn-success btn-sm' onclick='GetfilePath()'>"+lan.bt.path_ok+"</button></div>"
	});
	setCookie("ChangePath", c);
	var b = $("#" + d).val();
	tmp = b.split(".");
	if(tmp[tmp.length - 1] == "gz") {
		tmp = b.split("/");
		b = "";
		for(var a = 0; a < tmp.length - 1; a++) {
			b += "/" + tmp[a]
		}
		setCookie("SetName", tmp[tmp.length - 1])
	}
	b = b.replace(/\/\//g, "/");
	GetDiskList(b);
	ActiveDisk()
}
function GetDiskList(b) {
	var d = "";
	var a = "";
	var c = "path=" + b + "&disk=True";
	$.post("/files?action=GetDir", c, function(h) {
		// if(h.DISK != undefined) {
		// 	for(var f = 0; f < h.DISK.length; f++) {
		// 		a += "<dd onclick=\"GetDiskList('" + h.DISK[f].path + "')\"><span class='glyphicon glyphicon-hdd'></span>&nbsp;" + h.DISK[f].path + "</dd>"
		// 	}
		// 	$("#changecomlist").html(a)
        // }
        if (h.PATH != undefined) {
            a = "<dd onclick=\"GetDiskList('/')\"><span class='glyphicon glyphicon-hdd'></span>&nbsp;/</dd>"
            $("#changecomlist").html(a)
        }
		for(var f = 0; f < h.DIR.length; f++) {
			var g = h.DIR[f].split(";");
			var e = g[0];
			if(e.length > 20) {
				e = e.substring(0, 20) + "..."
			}
			if(isChineseChar(e)) {
				if(e.length > 10) {
					e = e.substring(0, 10) + "..."
				}
			}
			d += "<tr><td onclick=\"GetDiskList('" + h.PATH + "/" + g[0] + "')\" title='" + g[0] + "'><span class='glyphicon glyphicon-folder-open'></span>" + e + "</td><td>" + getLocalTime(g[2]) + "</td><td><span class='delfile-btn' onclick=\"NewDelFile('" + h.PATH + "/" + g[0] + "')\">X</span></td></tr>"
		}
		if(h.FILES != null && h.FILES != "") {
			for(var f = 0; f < h.FILES.length; f++) {
				var g = h.FILES[f].split(";");
				var e = g[0];
				if(e.length > 20) {
					e = e.substring(0, 20) + "..."
				}
				if(isChineseChar(e)) {
					if(e.length > 10) {
						e = e.substring(0, 10) + "..."
					}
				}
				d += "<tr><td title='" + g[0] + "'><span class='glyphicon glyphicon-file'></span>" + e + "</td><td>" + getLocalTime(g[2]) + "</td><td></td></tr>"
			}
		}
		$(".default").hide();
		$(".file-list").show();
		$("#tbody").html(d);
		if(h.PATH.substr(h.PATH.length - 1, 1) != "/") {
			h.PATH += "/"
		}
		$("#PathPlace").find("span").html(h.PATH);
		ActiveDisk();
		return
	})
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