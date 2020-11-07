$(function(){
  // 日历插件
  laydate.render({
      elem: '.date-select' //指定元素
  });
  // 弹窗隐藏
  function popupHide(){
      $('.popup-bg').fadeOut(300);
  };
  $('.popup-bg,.popup-box .close').click(function(){
      popupHide();
  });
  $('.popup-box').click(function(e){
      e=e || window.event ;
      e.stopPropagation ? (e.stopPropagation()) : (e.cancelBubble=true);  
  })
});