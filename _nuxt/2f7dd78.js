(window.webpackJsonp=window.webpackJsonp||[]).push([[7],{282:function(t,e,n){var content=n(310);"string"==typeof content&&(content=[[t.i,content,""]]),content.locals&&(t.exports=content.locals);(0,n(20).default)("1217bb9e",content,!0,{sourceMap:!1})},309:function(t,e,n){"use strict";n(282)},310:function(t,e,n){(e=n(19)(!1)).push([t.i,".book-list[data-v-352d3774],ul[data-v-352d3774]{margin:1rem auto}ul[data-v-352d3774]{text-align:center;font-size:1.1rem}ul li[data-v-352d3774]{padding:.1rem}",""]),t.exports=e},359:function(t,e,n){"use strict";n.r(e);n(29);var r=n(5),o={asyncData:function(t){return Object(r.a)(regeneratorRuntime.mark((function e(){var n,r,o;return regeneratorRuntime.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return n=t.$content,t.params,r=t.error,e.next=3,n("books","index").fetch().catch((function(t){r({statusCode:404,message:"Page not found",err:t})}));case 3:return o=e.sent,e.abrupt("return",{title:o.title?o.title:"Books",books:o.books});case 5:case"end":return e.stop()}}),e)})))()}},c=(n(309),n(10)),component=Object(c.a)(o,(function(){var t=this,e=t.$createElement,n=t._self._c||e;return n("div",{staticClass:"main"},[n("h1",{staticClass:"main-title"},[t._v(t._s(t.title))]),t._v(" "),n("div",{staticClass:"book-list"},[n("ul",t._l(t.books,(function(e){return n("li",{key:e.title},[t._v("\n        "+t._s(e.title)+"\n      ")])})),0)]),t._v("\n  ....\n")])}),[],!1,null,"352d3774",null);e.default=component.exports}}]);