var http = require('http');
var express = require('express');
var path = require('path');
// 用express创建app应用
var app = express();

// 设置静态资源路径
app.use(express.static(__dirname+'/bower_components'));

/*
* 数据匹配及存入数组函数
*   reg：正则表达式
*   conHtml：匹配源内容（这里是爬取到的html）
*   arr：存储数组
*   mark：补全链接标记，如果有传入，则为arr1补全网址（前面添加 cnodejs.org）
* */
function regMatch(reg,conHtml,arr1,arr2,mark) {
    var i=0;
    do {
        var data = reg.exec(conHtml);
        // 使数据存入相应数组。根据目标网站DOM结构，部分链接（mark标记）需要补全。
        if (data !== null){
            if (mark === 1){
                arr1.push('http://cnodejs.org' + data[1]);
            }else {
                arr1.push(data[1]);
            }
            if (arr2){
                arr2.push(data[2]);
            }
        }
        i += 1;
    }while(i<40); // 本来是用while(reg.exec(conHtml))，容错性更好。
                  // 但测试发现其会"执行"一次exec（），间接导致reg.lastIndex隔过一个，打乱原来顺序。
}

/*首页*/
app.get('/',function (req, res) {
    // 请求首页会直接返回一个Vue的view-model页面，然后通过Vue、axios（类Ajax）请求数据并返回加载。
    res.sendFile(path.join(__dirname, '/views', 'display-data.html'));
});

/*
* 接收到axiox的数据请求后
*   http.get获取目标网址的目标数据
*       定义容器数组
*       匹配目标数据的正则表达式
*       调用匹配转存函数
*       调用相应数据函数resJson（）
*   写回调函数resJson（）
*       是因为直接res.json()的话，会在数据存入数组成功之前返回空数组（类似异步，尝试Promise未成功）。
*       而直接在http里面响应res.json()的话又提示没有json方法。
* */
app.get('/getData',function (req, res) {
    // 目标数据：CNode社区首页
    var targetURL = 'http://cnodejs.org/';
    http.get(targetURL,function (res) {
        var myArr = {
            authorLink : [],
            authorPic : [],
            titleLink : [],
            titleCont : [],
            replyTime :[]
        };
        var theHtml = '';
        // 首页数据流爬存到theHtml
        res.on('data',function (chunk) {
            theHtml += chunk;
        });
        res.on('end',function () {
            /*匹配正则：
             *   发布者个人信息（链接、头像）
             *   标题（链接、内容）
             *   最新回复时间
             **/
            var authorReg = /<a\sclass="user_avatar\spull-left"\shref="(.*?)">\n\s*<img\ssrc="(.*?)"\n.*?\n\s*\/>/g
                ,titleReg = /<a\sclass='topic_title'\shref='(.*?)'.*?>\n(.*?)\n\s*<\/a>/g
                ,lastReplyReg = /<span\sclass="last_active_time">(.*?)<\/span>/g;
            // 调用专用函数获取数据并压入相应数组保存
            regMatch(authorReg,theHtml,myArr.authorLink,myArr.authorPic,1);
            regMatch(titleReg,theHtml,myArr.titleLink,myArr.titleCont,1);
            regMatch(lastReplyReg,theHtml,myArr.replyTime);
            // 调用响应函数
            resJson(myArr);
        })
    });
    // 返回数据给前端页面
    function resJson(resData) {
        res.json(resData)
    }
});

// 跑起来
var server = app.listen(3000,'127.0.0.1',function () {
    console.log('正常运行');
});



