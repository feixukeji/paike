if (/Android|webOS|iPhone|iPod|BlackBerry/i.test(navigator.userAgent)) $("#urlforpc").css("margin-bottom","5px").show();
else $("#nav").show();

var tongshiThreshold=3;
var form=layui.form,table=layui.table,element=layui.element;

$("#semester").html("当前数据："+semester+"（不定期同步，如有差异，请以教务系统为准）");
if(localStorage.getItem("semester")!=semester||localStorage.getItem("version")!=version){
    localStorage.removeItem("myCourse");
    localStorage.setItem("version",version);
    localStorage.setItem("semester",semester);
} //新学期（或本工具有非兼容性更新时）清空旧数据

for(var i in allLesson){
    if(allLesson[i].timeType1==undefined)allLesson[i].timeType1=0;
    if(allLesson[i].tongshi==undefined)allLesson[i].tongshi=0;
    if(allLesson[i].icourseRating==undefined)allLesson[i].icourseRating="暂无";
    allLesson[i].tendency=3;
    allLesson[i].area=mapLocation(allLesson[i].placeDayTime);
    allLesson[i].LAY_CHECKED=false;
} //所有课堂列表，形如[{code:"001046.01",courseName:"数值分析",teacher:"徐岩",weekType:4095,timeType0:16408,timeType1:0,tongshi:0,placeDayTime:"5503:1(8,9,10);5503:3(6,7)",icourseRating:"暂无",tendency:3,LAY_CHECKED:false},...]

var preference=JSON.parse(localStorage.getItem("preference"));
if(preference==undefined||preference.emptyHalf==undefined){
    preference={noConflict1:1,noConflict2:1,normalOption:5,noConflict:0,noMove1:0,noMove2:0,noManyClasses:0,emptyHalf:0};
    localStorage.setItem("preference",JSON.stringify(preference));
} //个人偏好

var myCourse=JSON.parse(localStorage.getItem("myCourse"));
if(myCourse==null) myCourse=[]; //已经添加的课程列表，形如[{code:"MATH1007",courseName:"数学分析(B2)",teacher:"程艺/...",lessons:[{code:"MATH1007.01",courseName:"数学分析(B2)",teacher:"程艺",weekType:262143,timeType0:33562626,timeType1:0,tongshi:0,placeDayTime:"5204:1(3,4);5204:3(3,4);5204:5(3,4)",icourseRating:"暂无",tendency:3},...],LAY_CHECKED:true},...]

var editingCourse=null; //当前正在编辑的课程

function showTip(tip,elem){ //显示提示
    indexTip=layer.tips(tip,elem,{tips:1,time:0});
}
function closeTip(){ //关闭提示
    layer.close(indexTip);
}

function getCourse(code){ //根据课堂编号返回课程编号
    return code.substring(0,code.indexOf("."));
}

function findCourse(code){ //根据编号返回所在myCourse的下标
    for(var i in myCourse)
        if(myCourse[i].code==code)return i;
    return -1;
}
function addACourse(code,courseName,teacher,lessons,weekType){ //向myCourse添加一门课程
    var i=findCourse(code);
    if(i==-1)myCourse.push({code:code,courseName:courseName,teacher:teacher,lessons:lessons,weekType:weekType,LAY_CHECKED:true});
    else myCourse[i].teacher=teacher,myCourse[i].lessons=lessons,myCourse[i].weekType=weekType;
}

table.render({ //初始化渲染已经选择的课程列表
    elem:"#courseList",
    height:"full-210",
    cols:[[
        {type:"checkbox"},
        {field:"code",title:"课程编号",width:110},
        {field:"courseName",title:"课程名称",width:170},
        {field:"teacher",title:"授课教师",minWidth:120},
        {title:"操作",width:125,align:"center",templet:"#courseTool"}
    ]],
    data:myCourse,
    limit:10000,
    scrollPos:"fixed",
    text:{none:"空"}
});
table.on("checkbox(courseList)",function(obj){ //勾选/取消勾选课程
    if(obj.type=="one") myCourse[findCourse(obj.data.code)].LAY_CHECKED=obj.checked;
    else for(var i in myCourse) myCourse[i].LAY_CHECKED=obj.checked;
    localStorage.setItem("myCourse",JSON.stringify(myCourse));
});
table.on("tool(courseList)",function(obj){
    if(obj.event=="edit"){ //编辑课程
        editingCourse=obj.data;
        editCourse();
    }
    else if(obj.event=="del"){ //删除课程
        layer.confirm("确定删除该课程吗？",{title:false,closeBtn:0,icon:0},function(index){
            myCourse.splice(findCourse(obj.data.code),1);
            localStorage.setItem("myCourse",JSON.stringify(myCourse)); //将已经选择的课程列表存至本地
            obj.del();
            layer.close(index);
        });
    }
});

initSettings();

function rendersettingTable(){
    let title = ["将叠一门视为不叠课(填入0或1)", "最大叠课数量(填入0~4)", "最大化总选课倾向度", "尽量不叠课", "同半天不往返东西区的方案优先", "不往返本部和高新区的方案优先", "避免单天四个或五个时段有课优先", "空出整个半天优先"];
    let initval = [preference.noConflict1, preference.noConflict2, preference.normalOption, preference.noConflict, preference.noMove1, preference.noMove2, preference.noManyClasses, preference.emptyHalf]
    let data = title.map((item, index) => ({
        id: index + 1,
        title: item,
        number: initval[index]
    }));
    table.render({
        elem: '#settingsTable',
        data: data,
        cols: [[
            {field: 'title', title: '设置', minWidth: 240, align: "center"},
            {field: 'number', title: '优先级(0~10的整数,0表示无效)', minWidth: 230, edit: 'number', min: 0, max: 10, templet: function(d) {
                return `<input type="number" name="settings" lay-filter="settings" value="${d.number}" class="layui-input number-input">`;
            }}
        ]]
    });
}

function initSettings(){
    rendersettingTable();
    table.on('edit(settingsTable)', function(obj){
        let id = obj.index;
        let number = Math.floor(obj.value);
        if(number < 0)number = 0;
        if(number > 10)number = 10;
        if(id==0){
            if(number>1)number=1;
            preference.noConflict1 = number;
        }
        if(id==1){
            if(number>4)number=4;
            preference.noConflict2 = number;
        }
        if(id==2)preference.normalOption = number;
        if(id==3)preference.noConflict = number;
        if(id==4)preference.noMove1 = number;
        if(id==5)preference.noMove2 = number;
        if(id==6)preference.noManyClasses = number;
        if(id==7)preference.emptyHalf = number;
        localStorage.setItem("preference",JSON.stringify(preference));
        obj.update({[obj.field]: number});
    });
}

function addCourse(){ //添加课程
    $("#subtitle").html("添加课程");
    $("#searchCourse").show();
    $("#main").hide();
    $("#course").show();
}
function editCourse(){ //编辑课程
    $("#subtitle").html("编辑课程");
    $("#searchCourse").hide();
    $("#main").hide();
    $("#course").show();
    var lessons=[];
    for(var i in allLesson)
        if(getCourse(allLesson[i].code)==editingCourse.code){ //查找该课程
            allLesson[i].tendency=3;
            allLesson[i].LAY_CHECKED=false;
            for(var j in editingCourse.lessons)
                if(allLesson[i].code==editingCourse.lessons[j].code){ //若该课堂已选
                    allLesson[i].tendency=editingCourse.lessons[j].tendency;
                    allLesson[i].LAY_CHECKED=true;
                    break;
                }
            lessons.push(allLesson[i]);
        }
    table.reloadData("lessonList",{data:lessons}); //渲染该课程的课堂列表
}

form.on("submit(search)",function(data){ //搜索课程
    var code=data.field.code,courseName=data.field.courseName,teacher=data.field.teacher;
    if(code!=""||courseName!=""||teacher!=""){
        var lessons=[];
        for(var i in allLesson)
            if((code==""||allLesson[i].code==code||getCourse(allLesson[i].code)==code)
                &&(courseName==""||allLesson[i].courseName.indexOf(courseName)!=-1)
                &&(teacher==""||allLesson[i].teacher.indexOf(teacher)!=-1)){
                    allLesson[i].LAY_CHECKED=false;
                    lessons.push(allLesson[i]);
                }
        table.reloadData("lessonList",{data:lessons}); //渲染搜索出来的课堂列表
    }
    return false;
});

table.render({ //初始化渲染课堂列表
    elem:"#lessonList",
    height:"full-225",
    cols:[[
        {type:"checkbox"},
        {field:"code",title:"课堂编号",width:120},
        {field:"courseName",title:"课程名称",width:120},
        {field:"teacher",title:"授课教师",width:120},
        {field:"placeDayTime",title:"时间地点",minWidth:140},
        {field:"volume",title:"<span id='vol' onmouseover='showTip(\"当前选中的人数，主要用于在选课开始前判断哪些班可以换班，非实时更新\",\"#vol\")' onmouseout='closeTip()'>容量<i class='layui-icon layui-icon-question' style='color:DodgerBlue;'></i></span>",width:90},
        {field:"icourseRating",title:"<span id='icourseRating' onmouseover='showTip(\"数据来源于评课社区https://icourse.club/，评分越高则同学们一般对该课堂越满意\",\"#icourseRating\")' onmouseout='closeTip()'>评分<i class='layui-icon layui-icon-question' style='color:DodgerBlue;'></i></span>",width:75,align:"center"},
        {field:"tendency",title:"<span id='tendency' onmouseover='showTip(\"倾向度越大则越优先，建议输入1~5的整数\",\"#tendency\")' onmouseout='closeTip()'>倾向度<i class='layui-icon layui-icon-question' style='color:DodgerBlue;'></i></span>",edit:"text",width:90,align:"center",style:"border:1px solid #AAAAAA;margin:2px;height:34px;padding:3px;"}
    ]],
    data:[],
    limit:10000,
    text:{none:"空"}
});

table.on('edit(lessonList)',function(obj){
    if(isNaN(Number(obj.value)))
        layer.alert("请输入数字！",{title:false,closeBtn:0,icon:0});
    let number = Math.floor(obj.value);
    if(number < 1)number = 1;
    if(number > 5)number = 5;
    obj.update({[obj.field]: number});
});

function confirmCourse(){ //确定添加/编辑
    var data=table.checkStatus("lessonList").data;
    for(var i in data)
        if(isNaN(Number(data[i].tendency))){
            layer.alert("在课堂 "+data[i].code+" 的倾向度中请输入数字！",{title:false,closeBtn:0,icon:2});
            return;
        }
    if(data.length>0){
        var lessons=[],code="",courseName="",teacher="";
        for(var i in data){
            if(data[i].tendency=="") data[i].tendency=3;
            else data[i].tendency=Number(data[i].tendency);
            if(i==0){
                lessons=[data[i]];
                code=getCourse(data[i].code);
                courseName=data[i].courseName;
                teacher=data[i].teacher;
                weekType=data[i].weekType;
            }
            else if(getCourse(data[i].code)==code){
                lessons.push(data[i]);
                teacher+="/"+data[i].teacher;
            }
            else {
                addACourse(code,courseName,teacher,lessons,weekType);
                lessons=[data[i]];
                code=getCourse(data[i].code);
                courseName=data[i].courseName;
                teacher=data[i].teacher;
                weekType=data[i].weekType;
            }
        }
        addACourse(code,courseName,teacher,lessons,weekType);
        localStorage.setItem("myCourse",JSON.stringify(myCourse)); //将已经选择的课程列表存至本地
        table.reloadData("courseList",{data:myCourse}); //重新渲染已经选择的课程列表
        cancelCourse();
    }
}

function exportPlan(){
    var lessons = [version, myCourse, preference];
    var jsonStr = JSON.stringify(lessons, null, 2);
    var blob = new Blob([jsonStr], { type: "application/json" });
    saveAs(blob, "排课数据.json");
}

 function importPlan(){
     $("#menu").hide();
     $("#importFile").show();
 }

let importedPlanData = null; // 全局变量保存导入数据

function upload() {
    const file = document.getElementById('fileInput').files[0]; // 获取文件输入框中的文件
    if (!file) {
        layer.alert('请选择一个文件！',{title:false,closeBtn:0,icon:2});
        return;
    }

    const reader = new FileReader(); // 创建文件读取对象
    reader.onload = function(event) {
        try {
            const result = event.target.result; // 获取读取到的文件内容
            importedPlanData = JSON.parse(result); // 将读取的内容解析为 JSON 数据

            // 防御性检查：确保数据是一个数组
            if (!Array.isArray(importedPlanData)) {
                layer.alert('导入文件格式错误，无法解析课程数据',{title:false,closeBtn:0,icon:2});
                return;
            }
            // 检查课程信息的版本是否一致
            if(importedPlanData[0].substring(0, 4) != version.substring(0, 4)) {
                layer.alert('导入文件的学期与当前学期不一致，无法导入',{title:false,closeBtn:0,icon:2});
                return;
            }
            else if(importedPlanData[0] != version) {
                layer.confirm('导入文件版本落后于当前内置版本，原因是教务系统的课程数据有更新，尝试导入但是可能会出错，是否继续？', {title:false,closeBtn:0,icon:3}, function(index){
                    myCourse = importedPlanData[1];
                    preference = importedPlanData[2];
                    // 关闭导入窗口并显示提示
                    localStorage.setItem("myCourse", JSON.stringify(myCourse));
                    table.reloadData("courseList", { data: myCourse });
                    localStorage.setItem("preference", JSON.stringify(preference));
                    rendersettingTable();
                    $("#importFile").hide();
                    $("#menu").show();
                    layer.alert("导入成功！",{title:false,closeBtn:0,icon:1});
                    layer.close(index);
                });
                return;
            }

            myCourse = importedPlanData[1];
            preference = importedPlanData[2];
            // 关闭导入窗口并显示提示
            localStorage.setItem("myCourse", JSON.stringify(myCourse));
            table.reloadData("courseList", { data: myCourse });
            localStorage.setItem("preference", JSON.stringify(preference));
            rendersettingTable();
            $("#importFile").hide();
            $("#menu").show();
            layer.alert("导入成功！",{title:false,closeBtn:0,icon:1});

        } catch (err) {
            // 如果发生解析错误，显示错误信息
            layer.alert('文件解析失败，请确保是正确的 JSON 格式：' + err.message,{title:false,closeBtn:0,icon:2});
        }
    };

    // 读取文件内容作为文本
    reader.readAsText(file, 'utf-8');
}

function cancelImport(){
    $("#menu").show();
    $("#importFile").hide();
}

function cancelCourse(){ //取消添加/编辑
    editingCourse=null;
    $("#main").show();
    $("#course").hide();
    form.val("searchCourse",{"code":"","courseName":"","teacher":""});
    table.reloadData("lessonList",{data:[]});
}

function backMain(){ //从排课方案页面返回主页面
    $("#main").show();
    $("#solution").hide();
    $("#settings").hide();
    $("#solutionTab ul").html("");
    $("#solutionTab div").html("");
}

function enterSettings(){
    $("#main").hide();
    $("#settings").show();
}

function prepare(){ //准备排课
    course=table.checkStatus("courseList").data; //选中的课程列表
    if(course.length>0){
        var tongshiCnt=0;
        for(var i in course)
            tongshiCnt+=course[i].lessons[0].tongshi;
        if(tongshiCnt<=tongshiThreshold)schedule();
        else //通识课超过tongshiThreshold门
            layer.confirm("你选择的通识课超过"+tongshiThreshold+"门，是否需要根据倾向度及与其他课程的冲突情况自动选择合适的"+tongshiThreshold+"门？",{title:false,closeBtn:0,icon:0,yes:function(index,layero){
                layer.close(index);
                schedule();
            }});
    }
}

function schedule(){ //开始排课
    var index=layer.load(2,{shade:0.3});
    setTimeout(function(){ //不知道为什么，不这么写就没法及时加载layer.load
        solution=[]; //排课方案，以冲突对数为第一关键字、满意度为第二关键字排序
        lessons=[]; //当前选定的课
        dfs(0,0,0);
        if(solution.length==0){
            layer.close(index);
            layer.alert("选课过多，无法使所有课程排入课表",{title:false,closeBtn:0,icon:2});
            return;
        }
        for(var i=0;i<solution.length;++i)
            element.tabAdd("solution",{title:"方案"+String(i+1),id:String(i)});
        element.tabChange("solution","0");
        layer.close(index);
        $("#main").hide();
        $("#solution").css("min-width","700px").show();
    },10);
}

function mapLocation(str){
    if(str[0]=='1'||str[0]=='2'||str[0]=='5')return 1;
    if(str[0]=='3')return 2;
    const Rules=[
    ['东区','第一教学楼','第二教学楼','第五教学楼','管理','东区','理化'],
    ['西区','第三教学楼','化工'],
    ["高新","学科楼","信智","GT"],["中区","ARTS"]];
    for(let i=0;i<4;++i)
        for(let j=0;j<Rules[i].length;++j)
            if(str.includes(Rules[i][j]))
                return i+1;
    return -1;
  }

var deg = new Array();
function dfs(i,tongshiCnt,satisfaction){
    var conflictCnt=0,mx=0;
    for(var j=0;j<i;++j)deg[j]=0;
    for(var j=0;j<i;++j)
        for(var k=0;k<j;++k)
            if(lessons[j].timeType0&lessons[k].timeType0){
                deg[j]++;deg[k]++;conflictCnt=1;
                break;
            }
    if(conflictCnt){
        for(var j=1;j<i;++j)if(deg[j]>deg[mx])mx=j;
        for(var j=0;j<i;++j)
            for(var k=0;k<j;++k)
                if(j!=mx&&k!=mx&&(lessons[j].timeType0&lessons[k].timeType0)){
                    conflictCnt++;
                    if(conflictCnt>1&&conflictCnt>preference.noConflict2)return;
                }
    }
    if(i==course.length){
        satisfaction*=Math.pow(4,preference.normalOption-5);
        if(preference.noConflict1==1&&conflictCnt==1)conflictCnt=0;
        if(conflictCnt>preference.noConflict2)return;
        if(preference.noConflict>0)satisfaction-=conflictCnt*Math.pow(4,preference.noConflict);
        if(preference.noMove1>0){
            for(var l=0;l<5;++l){
                var z=(3<<(l*6));
                for(let j=0;j<lessons.length;++j)if(lessons[j].timeType0&z)
                    for(var k=0;k<j;++k)if((lessons[k].timeType0&z)&&(lessons[j].weekType&lessons[k].weekType)){
                        if((lessons[j].timeType0&z)==(lessons[k].timeType0&z))continue;
                        var loc1=lessons[j].area,loc2=lessons[k].area;
                        if(loc1!=loc2&&loc1!=-1&&loc2!=-1)satisfaction-=Math.pow(4,preference.noMove1-5);
                    }
            }
            for(var l=0;l<5;++l){
                var z=(28<<(l*6));
                for(var j=0;j<lessons.length;++j)if(lessons[j].timeType0&z)
                    for(var k=0;k<j;++k)if((lessons[k].timeType0&z)&&(lessons[j].weekType&lessons[k].weekType)){
                        if((lessons[j].timeType0&z)==(lessons[k].timeType0&z))continue;
                        var loc1=lessons[j].area,loc2=lessons[k].area;
                        if(loc1!=loc2&&loc1!=-1&&loc2!=-1)satisfaction-=Math.pow(4,preference.noMove1-5);
                    }
            }
        }
        if(preference.noMove2>0){
            for(var l=0;l<5;++l){
                var z=(63<<(l*6));
                for(var j=0;j<lessons.length;++j)if(lessons[j].timeType0&z)
                    for(var k=0;k<j;++k)if((lessons[k].timeType0&z)&&(lessons[j].weekType&lessons[k].weekType)){
                        if((lessons[j].timeType0&z)==(lessons[k].timeType0&z))continue;
                        var loc1=lessons[j].area,loc2=lessons[k].area;
                        if(loc1!=-1&&loc2!=-1&&(loc1==3)+(loc2==3)==1)satisfaction-=Math.pow(4,preference.noMove2-5);
                    }
            }
        }
        if(preference.emptyHalf>0){
            for(var k=0;k<18;++k){
                for(var l=0;l<5;++l){
                    var z=(3<<(l*6)),q=0;
                    for(var j=0;j<lessons.length;++j)if((lessons[j].weekType&(1<<k))&&(lessons[j].timeType0&z))q=1;
                    if(!q)satisfaction+=Math.pow(4,preference.emptyHalf-5)/18;
                    z=(28<<(l*6)),q=0;
                    for(var j=0;j<lessons.length;++j)if((lessons[j].weekType&(1<<k))&&(lessons[j].timeType0&z))q=1;
                    if(!q)satisfaction+=Math.pow(4,preference.emptyHalf-5)/18;
                }
            }
        }
        if(preference.noManyClasses>0){
            for(var k=0;k<18;++k){
                for(var l=0;l<5;++l){
                    var z=(63<<(l*6)),cnt=0;
                    for(var j=0;j<lessons.length;++j)if((lessons[j].weekType&(1<<k))&&(lessons[j].timeType0&z))cnt+=1;
                    if(cnt>=4)satisfaction-=Math.pow(4,preference.noManyClasses-5)*(cnt-3)/18;
                }
            }
        }
        for(var j=solution.length;j>0;--j)
            if(solution[j-1].satisfaction>=satisfaction)break;
            else if(j<5)solution[j]=solution[j-1];
        if(j<5)solution[j]={satisfaction:satisfaction,lessons:lessons.concat()}; //排出最优的5种方案
        return;
    }
    for(var j in course[i].lessons){
        var lesson=course[i].lessons[j];
        if(tongshiCnt+lesson.tongshi>tongshiThreshold)dfs(i+1,tongshiCnt,satisfaction+lesson.tendency); //通识课过多
        else{
            lessons.push(lesson);
            dfs(i+1,tongshiCnt+lesson.tongshi,satisfaction+lesson.tendency);
            lessons.pop();
        }
    }
}

table.render({ //初始化渲染已选定的课堂列表
    elem:"#mylessonList",
    cols:[[
        {field:"code",title:"课堂编号",width:120},
        {field:"courseName",title:"课程名称",width:170},
        {field:"teacher",title:"授课教师",width:120},
        {field:"placeDayTime",title:"时间地点",minWidth:160},
        {field:"tendency",title:"倾向度",width:75,align:"center"}
    ]],
    data:[],
    limit:10000,
    text:{none:"空"}
});

var unitTimeRange={
    1:[7*60+50,8*60+35],
    2:[8*60+40,9*60+25],
    3:[9*60+45,10*60+30],
    4:[10*60+35,11*60+20],
    5:[11*60+25,12*60+10],
    6:[14*60+0,14*60+45],
    7:[14*60+50,15*60+35],
    8:[15*60+55,16*60+40],
    9:[16*60+45,17*60+30],
    10:[17*60+35,18*60+20],
    11:[19*60+30,20*60+15],
    12:[20*60+20,21*60+5],
    13:[21*60+10,21*60+55],
}

element.on("tab(solution)",function(data){ //切换排课方案
    var lessons=solution[data.index].lessons;
    table.reloadData("mylessonList",{data:lessons}); //显示选定的课程列表
    $(".courseTable").empty(); //清空课表
    var activities=[];
    var divElement = document.getElementById('creditDisplay');
    var credit = 0;
    for(var i in lessons)credit+=lessons[i].credit;
    divElement.textContent = '共计'+credit.toString()+'学分';
    for(var i in lessons){
        var placeDayTime=lessons[i].placeDayTime.split(";");
        for(var j in placeDayTime){
            if(placeDayTime[j]=="")continue;
            var activity=Object.assign({},lessons[i]);
            var pos=placeDayTime[j].lastIndexOf("(");
            pos=placeDayTime[j].lastIndexOf(":",pos);
            var dayTime=placeDayTime[j].substring(pos+1);
            activity.place=placeDayTime[j].substring(0,pos),activity.day=Number(dayTime[0]);
            var time=dayTime.substring(2,dayTime.length-1)
            if(time.indexOf("~")==-1){
                activity.unitsStr=time+"节";
                activity.units=time.split(',').map(Number);
            }
            else{
                activity.unitsStr=time;
                activity.units=[];
                var st=Number(time.substr(0,2))*60+Number(time.substr(3,2)),ed=Number(time.substr(6,2))*60+Number(time.substr(9,2));
                for(var unit in unitTimeRange)
                    if(Math.max(st,unitTimeRange[unit][0])<Math.min(ed,unitTimeRange[unit][1]))activity.units.push(Number(unit));
            }
            activity.startUnit=activity.units[0],activity.endUnit=activity.units[activity.units.length-1];
            activities.push(activity);
        }
    }

    //绘制课表结构
    var $courseTable=$('.courseTable');
    var $table=$('<table class="timetable"><thead><th colspan="2"></th><th scope="col">星期一</th><th scope="col">星期二</th><th scope="col">星期三</th><th scope="col">星期四</th><th scope="col">星期五</th><th scope="col">星期六</th><th scope="col">星期日</th></thead></table>');
    $courseTable.append($table);
    $.each([{"name":"上午","units":[[1,2],[3,4,5]],"tbodyClass":"s1"},{"name":"下午","units":[[6,7],[8,9,10]],"tbodyClass":"s2"},{"name":"晚上","units":[[11,12,13]],"tbodyClass":"s3"}],function(index,item){
        var spanNum=0;
        $.each(item.units,function(i,v){
            spanNum+=v.length;
        });

        var $tbody=$('<tbody class="'+item.tbodyClass+'"></tbody>');
        for(var k=0;k<item.units.length;++k) {
            var trNum=item.units[k].length;
            for(var j=0;j<item.units[k].length;++j) {
                var $tr=$('<tr class="'+item.units[k][j]+'"></tr>');
                if(j==0)
                    for(var i=0;i<9;i++)
                        if(i==0 && k==0)$tr.append('<th scope="row" rowspan="'+spanNum+'">'+item.name+'</th>');
                        else if(i==1)$tr.append('<th scope="row" class="span">'+item.units[k][i-1]+'</th>');
                        else $tr.append('<td></td>');
                else $tr.append('<th scope="row" class="span">'+item.units[k][j]+'</th><td></td><td></td><td></td><td></td><td></td><td></td><td></td>');
                $tbody.append($tr);
            }
            if(k!=0)$tbody.find('tr').eq(trNum+k-2).find('td').eq(0).css('display','none');
        }
        $table.append($tbody);
    })

    //处理叠课情况
    for(var i=0;i<activities.length;++i){
        var activity1=activities[i];
        if(activity1==null)continue;
        var startUnit1=activity1.startUnit,endUnit1=activity1.endUnit,units1=activity1.units;
        activity1.appendActivities=[];

        for(var j=i+1;j<activities.length;++j){
            var activity2=activities[j];
            if(activity2==null)continue;
            var startUnit2=activity2.startUnit,endUnit2=activity2.endUnit,units2=activity2.units;
            if(activity1.day==activity2.day && startUnit1==startUnit2 && endUnit1==endUnit2) //完全叠课
                activity1.appendActivities.push(activity2),activities[j]=null;
            else if(activity1.day==activity2.day){
                var flag=false;
                $.each(units1,function(index,unit){
                    if(units2.indexOf(unit)!=-1){
                        flag=true;
                        return;
                    }
                });
                if(flag) //部分叠课
                    if(startUnit1==startUnit2 && endUnit1!=endUnit2)
                        if(units1.length>units2.length)activity2.cover='cover';
                        else activity1.cover='cover';
                    else if(startUnit1!=startUnit2 && endUnit1==endUnit2)
                        if(units1.length>units2.length)activity2.cover='cover';
                        else activity1.cover='cover';
                    else if(units1.length>units2.length)activity2.cover='cover';
                        else activity1.cover='cover';
            }
        }
    }

    //绘制课表内容
    $.each(activities,function(index,activity){
        if(activity==null)return;

        var $td='',$tbody=$table.find('tbody');

        if([1,2,4,5,6,7,9,10,11,12,13].indexOf(activity.startUnit)!=-1)$td=$tbody.find('.'+(activity.startUnit)).find('td').eq(activity.day-1);
        else $td=$tbody.find('.'+(activity.startUnit)).find('td').eq(activity.day);

        addActivity($td,activity,true);

        //同一个框里显示的不同数据
        if(activity.appendActivities && activity.appendActivities.length>0)
            $.each(activity.appendActivities,function(i,activity2){
                addActivity($td,activity2,false);
            });
    });
});

function getStartEndWeekStr(weekType) {
    if (weekType === 0) return '';
    let startWeek = null, endWeek = null;
    for (let i = 0; i < 20; i++) {
        if ((weekType >> i) & 1) {
            if (startWeek === null) startWeek = i + 1;
            endWeek = i + 1;
        }
    }
    return `${startWeek}~${endWeek}周`;
}

function addActivity($td,activity,first){
    if(first) //单元格首次添加
        $td.append('<div class="cell '+(activity.cover?'cover':'nocover')+'" data-range="'+(activity.endUnit-activity.startUnit+1)+'"></div>');
    $td.find('.cell'+(activity.cover?'.cover':'.nocover')).append('<div class="c">'+
        '<h4 class="code">'+activity.code+'</h4>'+
        '<h3 class="courseName">'+activity.courseName+'</h3>'+
        '<p class="teacher">'+activity.teacher+'</p>'+
        '<p class="units">'+activity.unitsStr+'</p>'+
        '<p class="units">'+getStartEndWeekStr(activity.weekType)+'</p>'+
        '<p class="place"><span class="name">'+activity.place+'</span></p></div>');
}
