var bt = {
	get_random : function(len)
	{
		len = len || 32;
		var $chars = 'AaBbCcDdEeFfGHhiJjKkLMmNnPpRSrTsWtXwYxZyz2345678'; // 默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1  
		var maxPos = $chars.length;
		var pwd = '';
		for (i = 0; i < len; i++) {
			pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
		}
		return pwd;
	},
	get_file_path : function(filename)
	{
		var arr = filename.split('/');
		path = filename.replace('/'+arr[arr.length-1],"");
		return path;
	},
	set_cookie : function(key,val,time)
	{
		if(time != undefined){
			var exp = new Date();
			exp.setTime(exp.getTime() + time);
			time = exp.toGMTString();
		}else{
			var Days = 30;
			var exp = new Date();
			exp.setTime(exp.getTime() + Days*24*60*60*1000);
			time = exp.toGMTString();
		}
		document.cookie = key + "="+ escape (val) + ";expires=" + time;
	},
	get_cookie : function(key)
	{
		var arr,reg=new RegExp("(^| )"+key+"=([^;]*)(;|$)");
		if(arr=document.cookie.match(reg))
		{
			var val = unescape(arr[2]);
			return val== 'undefined'?'':val;
		}
		else{
			return null;
		}
	},
}
function CopyFile(fileName) {
    var path = $("#DirPathPlace input").val();
    setCookie('copyFileName', fileName);
    setCookie('cutFileName', null);
    layer.msg(lan.files.copy_ok, { icon: 1, time: 1000 });
    GetFiles(path);
}
function CutFile(fileName) {
    var path = $("#DirPathPlace input").val();
    setCookie('cutFileName', fileName);
    setCookie('copyFileName', null);
    layer.msg(lan.files.mv_ok, { icon: 1, time: 1000 });
    GetFiles(path);
}
function IsDiskWidth() {
    var comlistWidth = $("#comlist").width();
    var bodyWidth = $(".file-box").width();
    if (comlistWidth + 530 > bodyWidth) {
        $("#comlist").css({ "width": bodyWidth - 530 + "px", "height": "34px", "overflow": "auto" });
    }
    else {
        $("#comlist").removeAttr("style"); 
    } 
}
function getFileName(name) {
    var text = name.split(".");
    var n = text.length - 1;
    text = text[n];
    return text;
}
function ReisImage(fileName) {
    var exts = ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'tiff', 'ico'];
    for (var i = 0; i < exts.length; i++) {
        if (fileName == exts[i]) return true
    }
    return false;
}
function path_check(path) {
    if (path == '/') return path;
    path = path.replace(/[\/]{2,}/g, '/');
    path = path.replace(/[\/]+$/g, '');
    return path;
}
function auto_table_width() {
    var oldTable = $(window).height() - $('#tipTools')[0].getBoundingClientRect().height - $('#filePage')[0].getBoundingClientRect().height - 115;
    var oldTable_heigth = $('.oldTable table').height();
    $('.oldTable thead th').each(function (index, el) {
        var table_th = $('.oldTable thead th').length;
        var a = $('.newTable thead th').length
        $('.newTable thead th').eq(index).attr('width', el.offsetWidth);
        if (index == (table_th - 1)) $('.newTable thead th').eq(table_th - 1).css('padding', '0 20px 0 0');
    });
    if (oldTable_heigth > oldTable) {
        $('.oldTableShadow,.newTableShadow').show();
        $('.oldTable').css('marginTop', '0')
    } else {
        $('.oldTableShadow,.newTableShadow').hide();
        $('.oldTable').css('marginTop', '0')
    }
    $('.oldTable').height(oldTable);
    $('.oldTable table').css({ 'marginTop': '-40px' })
}
function totalFile() {
    var el = $("input[name='id']");
    var len = el.length;
    var count = 0;
    for (var i = 0; i < len; i++) {
        if (el[i].checked == true) {
            count++;
        }
    }
    return count;
}
function bindselect() {
    $("#filesBody").selectable({
        autoRefresh: false,
        filter: "tr,.folderBox",
        cancel: "a,span,input,.ico-folder",
        selecting: function (e) {
            $(".ui-selecting").find("input").prop("checked", true);
            showSeclect();
        },
        selected: function (e) {
            $(".ui-selectee").find("input").prop("checked", false);
            $(".ui-selected", this).each(function () {
                $(this).find("input").prop("checked", true);
                showSeclect();
            });
            $("#contextify-menu").hide();
        },
        unselecting: function (e) {
            $(".ui-selectee").find("input").prop("checked", false);
            $(".ui-selecting").find("input").prop("checked", true);
            showSeclect();
            $("#rmenu").hide()
        }
    });
    $("#filesBody").selectable("refresh");
    $(".ico-folder").click(function () {
        $(this).parent().addClass("ui-selected").siblings().removeClass("ui-selected");
        $(".ui-selectee").find("input").prop("checked", false);
        $(this).prev("input").prop("checked", true);
        showSeclect();
    })
}
// 批量操作UI
function showSeclect() {
    var count = totalFile();
    var BatchTools = '';
    if (count > 1) {
        BatchTools = '<button onclick="javascript:Batch(1);" class="btn btn-default btn-sm">' + lan.files.file_menu_copy + '</button>\
						  <button onclick="javascript:Batch(2);" class="btn btn-default btn-sm">'+ lan.files.file_menu_mv + '</button>\
						  <button onclick="javascript:Batch(5);" class="btn btn-default btn-sm">'+ lan.files.file_menu_zip + '</button>\
						  <button onclick="javascript:Batch(4);" class="btn btn-default btn-sm">'+ lan.files.file_menu_del + '</button>'
        $("#Batch").html(BatchTools);
    } else {
        $("#Batch").html(BatchTools);
    }
}
$(window).keyup(function(e){
    var tagName = e.target.tagName.toLowerCase();
    if(e.keyCode === 8 && tagName !== 'input' && tagName !== 'textarea'){ //判断当前键值码为space
        if($('.aceEditors')[0] == undefined || $('.aceEditors .layui-layer-content').height() === 0){
            BackDir();
        }
    }
    e.stopPropagation();
});
$("#PathPlaceBtn").width($(".file-box").width() - 700);
$("#DirPathPlace input").width($(".file-box").width() - 700);
if ($(window).width() < 1160) {
    $("#PathPlaceBtn").width(290);
}
window.onresize = function () {
    $("#PathPlaceBtn").width($(".file-box").width() - 700);
    $("#DirPathPlace input").width($(".file-box").width() - 700);
    if ($(window).width() < 1160) {
        $("#PathPlaceBtn,#DirPathPlace input").width(290);
    }
    PathLeft();
    IsDiskWidth()
    auto_table_width();
}
function GetExtName(fileName) {
    var extArr = fileName.split(".");
    var exts = ['folder', 'folder-unempty', 'sql', 'c', 'cpp', 'cs', 'flv', 'css', 'js', 'htm', 'html', 'java', 'log', 'mht', 'php', 'url', 'xml', 'ai', 'bmp', 'cdr', 'gif', 'ico', 'jpeg', 'jpg', 'JPG', 'png', 'psd', 'webp', 'ape', 'avi', 'flv', 'mkv', 'mov', 'mp3', 'mp4', 'mpeg', 'mpg', 'rm', 'rmvb', 'swf', 'wav', 'webm', 'wma', 'wmv', 'rtf', 'docx', 'fdf', 'potm', 'pptx', 'txt', 'xlsb', 'xlsx', '7z', 'cab', 'iso', 'bz2', 'rar', 'zip', 'gz', 'bt', 'file', 'apk', 'bookfolder', 'folder', 'folder-empty', 'folder-unempty', 'fromchromefolder', 'documentfolder', 'fromphonefolder', 'mix', 'musicfolder', 'picturefolder', 'videofolder', 'sefolder', 'access', 'mdb', 'accdb', 'sql', 'c', 'cpp', 'cs', 'js', 'fla', 'flv', 'htm', 'html', 'java', 'log', 'mht', 'php', 'url', 'xml', 'ai', 'bmp', 'cdr', 'gif', 'ico', 'jpeg', 'jpg', 'JPG', 'png', 'psd', 'webp', 'ape', 'avi', 'flv', 'mkv', 'mov', 'mp3', 'mp4', 'mpeg', 'mpg', 'rm', 'rmvb', 'swf', 'wav', 'webm', 'wma', 'wmv', 'doc', 'docm', 'dotx', 'dotm', 'dot', 'rtf', 'docx', 'pdf', 'fdf', 'ppt', 'pptm', 'pot', 'potm', 'pptx', 'txt', 'xls', 'csv', 'xlsm', 'xlsb', 'xlsx', '7z', 'gz', 'cab', 'iso', 'rar', 'zip', 'bt', 'file', 'apk', 'css'];
    var extLastName = extArr[extArr.length - 1];
    for (var i = 0; i < exts.length; i++) {
        if (exts[i] == extLastName) {
            return exts[i];
        }
    }
    return 'file';
}
function ShowEditMenu() {
    $("#filesBody > tr").hover(function () {
        $(this).addClass("hover");
    }, function () {
        $(this).removeClass("hover");
    }).click(function () {
        $(this).addClass("on").siblings().removeClass("on");
    })
}
function GetFileName(fileNameFull) {
    var pName = fileNameFull.split('/');
    return pName[pName.length - 1];
}
function BackDir() {
    var str = $("#DirPathPlace input").val().replace('//', '/');
    if (str.substr(str.length - 1, 1) == '/') {
        str = str.substr(0, str.length - 1);
    }
    var Path = str.split("/");
    var back = '/';
    if (Path.length > 2) {
        var count = Path.length - 1;
        for (var i = 0; i < count; i++) {
            back += Path[i] + '/';
        }
        if (back.substr(back.length - 1, 1) == '/') {
            back = back.substr(0, back.length - 1);
        }
        GetFiles(back);
    } else {
        back += Path[0];
        GetFiles(back);
    }
    setTimeout('PathPlaceBtn(getCookie("Path"));', 200);
}
function ReloadFiles() {
    setInterval(function () {
        var path = $("#DirPathPlace input").val();
        GetFiles(path);
    }, 3000);
}
var outTime = null;
function outTimeGet() {
    outTime = setInterval(function () {
        if (!$("#mExec").attr('name')) {
            clearInterval(outTime);
            return;
        }
        GetShellEcho();
    }, 1000);
}
function isZip(fileName) {
    var ext = fileName.split('.');
    var extName = ext[ext.length - 1].toLowerCase();
    if (extName == 'zip' || extName == 'war' || extName == 'rar') return 0;
    if (extName == 'gz' || extName == 'tgz' || extName == 'bz2') return 1;
    return -1;
}
function isText(fileName) {
    var exts = ['rar', 'war', 'zip', 'tar.gz', 'gz', 'iso', 'xsl', 'doc', 'xdoc', 'jpeg', 'jpg', 'png', 'gif', 'bmp', 'tiff', 'exe', 'so', '7z', 'bz', 'bz2','ico'];
    return isExts(fileName, exts) ? false : true;
}
function isImage(fileName) {
    var exts = ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'tiff', 'ico'];
    return isExts(fileName, exts);
}
function isVideo(fileName) {
    var exts = ['mp4', 'mpeg', 'mpg', 'mov', 'avi', 'webm', 'mkv'];
    return isExts(fileName, exts);
}
function isPhp(fileName){
	var exts = ['php'];
	return isExts(fileName,exts);
}
function isExts(fileName, exts) {
    var ext = fileName.split('.');
    if (ext.length < 2) return false;
    var extName = ext[ext.length - 1].toLowerCase();
    for (var i = 0; i < exts.length; i++) {
        if (extName == exts[i]) return true;
    }
    return false;
}
function GetImage(fileName) {
    var imgUrl = '/download?filename=' + fileName;
    layer.open({
        type: 1,
        closeBtn: 2,
        title: false,
        area: '500px',
        shadeClose: true,
        content: '<div class="showpicdiv"><img src="' + imgUrl + '"></div>',
    }); 
    $(".layui-layer").css("top", "30%");
}
function play_file(obj,filename) {
    if($('#btvideo video').attr('data-filename')== filename) return false;
    var imgUrl = '/download?filename=' + filename + '&play=true';
    var v = '<video src="' + imgUrl +'" controls="controls" data-fileName="'+ filename +'" autoplay="autoplay" width="640" height="360">\
                    您的浏览器不支持 video 标签。\
                    </video>'
    $("#btvideo").html(v);
    var p_tmp = filename.split('/')
    $(".btvideo-title").html(p_tmp[p_tmp.length-1]);
    $(".video-avt").removeClass('video-avt');
    $(obj).parents('tr').addClass('video-avt');
}
function RClick(type, path, name, file_store,file_share,data_composer) {
    var displayZip = isZip(type);
    var options = {
        items: [
            { text: lan.files.file_menu_copy, onclick: function () { CopyFile(path) } },
            { text: lan.files.file_menu_mv, onclick: function () { CutFile(path) } },
            { text: lan.files.file_menu_rename, onclick: function () { ReName(0, name) } },
            { text: lan.files.file_menu_zip, onclick: function () { Zip(path) } }
        ]
    };

    if (type == "dir") {
        options.items.push(
        	{ text: lan.files.file_menu_del, onclick: function () { DeleteDir(path) } },
        );
    }
    
    else if(isPhp(type)){
    	options.items.push({ text: lan.files.file_menu_edit, onclick: function () { openEditorView(0, path) } }, { text: lan.files.file_menu_down, onclick: function () { GetFileBytes(path) } }, { text: lan.files.file_menu_del, onclick: function () { DeleteFile(path) } })
    }
    else if (isVideo(type)) {
        options.items.push({ text: '播放', onclick: function () { GetPlay(path) } }, { text: lan.files.file_menu_down, onclick: function () { GetFileBytes(path) } }, { text: lan.files.file_menu_del, onclick: function () { DeleteFile(path) } });
    }
    else if (isText(type)) {
        options.items.push({ text: lan.files.file_menu_edit, onclick: function () { openEditorView(0, path) } }, { text: lan.files.file_menu_down, onclick: function () { GetFileBytes(path) } }, { text: lan.files.file_menu_del, onclick: function () { DeleteFile(path) } });
    }
    else if (displayZip != -1) {
        options.items.push({ text: lan.files.file_menu_unzip, onclick: function () { UnZip(path, displayZip) } }, { text: lan.files.file_menu_down, onclick: function () { GetFileBytes(path) } }, { text: lan.files.file_menu_del, onclick: function () { DeleteFile(path) } });
    }
    else if (isImage(type)) {
        options.items.push({ text: lan.files.file_menu_img, onclick: function () { GetImage(path) } }, { text: lan.files.file_menu_down, onclick: function () { GetFileBytes(path) } }, { text: lan.files.file_menu_del, onclick: function () { DeleteFile(path) } });
    }
    else {
        options.items.push({ text: lan.files.file_menu_down, onclick: function () { GetFileBytes(path) } }, { text: lan.files.file_menu_del, onclick: function () { DeleteFile(path) } });
    }
    return options;
}
function RClickAll(e) {
    var menu = $("#rmenu");
    var windowWidth = $(window).width(),
        windowHeight = $(window).height(),
        menuWidth = menu.outerWidth(),
        menuHeight = menu.outerHeight(),
        x = (menuWidth + e.clientX < windowWidth) ? e.clientX : windowWidth - menuWidth,
        y = (menuHeight + e.clientY < windowHeight) ? e.clientY : windowHeight - menuHeight;

    menu.css('top', y)
        .css('left', x)
        .css('position', 'fixed')
        .css("z-index", "1")
        .show();
}
$("body").not(".def-log").click(function () {
    $("#rmenu").hide()
});
$("#DirPathPlace input").keyup(function (e) {
    if (e.keyCode == 13) {
        GetFiles($(this).val());
    }
});
function PathPlaceBtn(path) {
    var html = '';
    var title = '';
    path = path.replace('//', '/');
    var Dpath = path;
    if (path == '/') {
        html = '<li><a title="/">' + lan.files.path_root + '</a></li>';
    }
    else {
        Dpath = path.split("/");
        for (var i = 0; i < Dpath.length; i++) {
            title += Dpath[i] + '/';
            Dpath[0] = lan.files.path_root;
            html += '<li><a title="' + title + '">' + Dpath[i] + '</a></li>';
        }
    }
    html = '<div style="width:1200px;height:26px"><ul>' + html + '</ul></div>';
    $("#PathPlaceBtn").html(html);
    $("#PathPlaceBtn ul li a").click(function (e) {
        var Gopath = $(this).attr("title");
        if (Gopath.length > 1) {
            if (Gopath.substr(Gopath.length - 1, Gopath.length) == '/') {
                Gopath = Gopath.substr(0, Gopath.length - 1);
            }
        }
        GetFiles(Gopath);
        e.stopPropagation();
    });
    PathLeft();
}
function PathLeft() {
    var UlWidth = $("#PathPlaceBtn ul").width();
    var SpanPathWidth = $("#PathPlaceBtn").width() - 50;
    var Ml = UlWidth - SpanPathWidth;
    if (UlWidth > SpanPathWidth) {
        $("#PathPlaceBtn ul").css("left", -Ml)
    }
    else {
        $("#PathPlaceBtn ul").css("left", 0)
    }
}
$("#PathPlaceBtn").on("click", function (e) {
    if ($("#DirPathPlace").is(":hidden")) {
        $("#DirPathPlace").css("display", "inline");
        $("#DirPathPlace input").focus();
        $(this).hide();
    } else {
        $("#DirPathPlace").hide();
        $(this).css("display", "inline");
    }
    $(document).one("click", function () {
        $("#DirPathPlace").hide();
        $("#PathPlaceBtn").css("display", "inline");
    });
    e.stopPropagation();
});
$("#DirPathPlace").on("click", function (e) {
    e.stopPropagation();
});