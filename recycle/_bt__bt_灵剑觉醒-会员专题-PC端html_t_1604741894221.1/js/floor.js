/*楼层自动跳转*/
;(function($){
    $.fn.floor = function(opitons){
        var defaults = {
            floor : '.m-bg .part',
            floorNav : '.nav-wrap .nav',
        };
        return this.each(function(){
            var a = $.extend({}, defaults , opitons);
            var b = $(a.floor);
            var d = $(a.floorNav);
            var c = $(a.floorNav).find('li');
                c.eq(0).addClass('on');
            $(window).scroll(function(){
                var h = $(window).height();
                    t = $(window).scrollTop();
            //    if(t>=400){
            //         d.fadeIn(400);
            //         $('.nav_wrap').addClass('fixed');
            //     }else{
            //         d.fadeOut(400);
            //         $('.nav_wrap').removeClass('fixed');
            //     };
                b.each(function(){
                    var i = $(this),
                        iT = i.offset().top;
                    if(h+t-iT>h/2){
                        c.removeClass('on').eq(i.index()).addClass('on');
                    }
                    if(t<50){
                        c.removeClass('on').eq(0).addClass('on');
                    }
                })
            });
            c.click(function(){
                var i = $(this);
                var t = b.eq(i.index()).offset().top;
                $('body,html').animate({"scrollTop":t},500);
            });
            d.find('.top').click(function(){
              $('body,html').animate({"scrollTop":0},500);
            });
        });
    };
})(jQuery);
