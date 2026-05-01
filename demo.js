
/**
 * @Description: AutoX.js 掌上华医自动学习考试脚本（免费版）
 * @version: 2.1.0
 * @Author: UnaAtadura
 * @Date: 2026.04.30 11:08
 */



// ==============================================
// 配置
// ==============================================
const 题库文件路径 = files.path("./考试题库.json");
let 题库 = 读取题库();
let 上一题文字 = "";
let 当前选项字母 = "A";
let 考试次数 = 0;
const 最大考试次数 = 5;

// ==============================================
// UI 布局
// ==============================================
auto.waitFor();



初始化音量控制();


// ==============================================
// 音量控制（新增）
// ==============================================
let yinLiang = 0;


function 初始化音量控制() {
    yinLiang = device.getMusicVolume();
    log("记录原始音量：" + yinLiang);
}

function 开启静音() {
    device.setMusicVolume(0);
    log("已静音");
}

function 恢复音量() {
    device.setMusicVolume(yinLiang);
    log("恢复原来音量:" + yinLiang);
}

// ==============================================
// 悬浮窗相关
// ==============================================
let floatyWindow = null;
let logText = "";
let exitListenerRegistered = false;

/**
 * 创建悬浮窗
 * @returns {boolean} 是否成功创建
 */
function createFloatWindow() {
    if (floatyWindow) return true;

    // 请求悬浮窗权限（如果未授予）
    if (!floaty.checkPermission()) {
        toast("请授予悬浮窗权限");
        floaty.requestPermission();
        let startTime = Date.now();
        while (!floaty.checkPermission() && Date.now() - startTime < 10000) {
            sleep(500);
        }
        if (!floaty.checkPermission()) {
            toast("未获得悬浮窗权限，无法显示日志");
            return false;
        }
    }

    // 创建悬浮窗（使用标准颜色格式 #AARRGGBB）
    floatyWindow = floaty.rawWindow(
        // #80000000 是半透明黑色，如果想要更透明可以调整前两位（如 #40000000），或者使用纯黑色 #00000000 完全透明背景
        <frame bg="#80000000" gravity="left" padding="8">  
        {/* <frame bg="#000000" gravity="left" padding="8"> */}
            <vertical>
                <text id="title" text="日志输出" textColor="#FF4CAF50" textSize="15sp" />
                <scroll id="scroll" w="*" h="0" layout_weight="1">
                    <text id="log" text="等待日志..." textColor="#FFFFFFFF" textSize="12sp" />
                </scroll>
            </vertical>
        </frame>
    );

    // 设置窗口属性
    floatyWindow.setTouchable(false);           // 不可触摸，避免干扰操作
    floatyWindow.setPosition(0, 10);            // 顶部
    floatyWindow.setSize(device.width, 400);    // 全宽，高度300

    logText = "";  // 清空缓存

    // 注册脚本退出时的清理事件（只一次）
    if (!exitListenerRegistered) {
        events.on('exit', function () {
            恢复音量();       
            closeFloatWindow();
        });
        exitListenerRegistered = true;
    }

    return true;
}

/**
 * 追加日志到悬浮窗
 * @param {string} msg 日志内容
 */
function appendLog(msg) {
    logText += msg + "\n";
    if (logText.length > 1000) {
        logText = logText.slice(-1000);  // 保留最近1000字符
    }

    if (floatyWindow) {
        ui.run(() => {
            try {
                floatyWindow.log.setText(logText);
                // 强制滚动到底部（使用足够大的数值）
                floatyWindow.scroll.scrollTo(0, 99999);
            } catch (e) {
                // 忽略窗口已关闭等异常
            }
        });
    }
}

/**
 * 关闭悬浮窗
 */
function closeFloatWindow() {
    if (floatyWindow) {
        floatyWindow.close();
        floatyWindow = null;
    }
}

// 重写 log 函数，同时输出到控制台和悬浮窗
const originalLog = log;
log = function (msg) {
    originalLog(msg);
    appendLog(String(msg));
};

// ==============================================
// 工具函数
// ==============================================
function timeToSeconds(timeStr) {
    if (!timeStr || timeStr.indexOf(":") === -1) return 0;
    let parts = timeStr.split(":").map(Number);
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function 下一个字母(c) {
    switch (c) {
        case "A": return "B";
        case "B": return "C";
        case "C": return "D";
        case "D": return "E";
        default: return "A";
    }
}

// ==============================================
// 题库相关
// ==============================================
function 读取题库() {
    try {
        if (files.exists(题库文件路径))
            return JSON.parse(files.read(题库文件路径));
    } catch (e) { }
    return {};
}

function 保存题库() {
    try {
        files.write(题库文件路径, JSON.stringify(题库, null, 2));
    } catch (e) {
        log("保存题库失败：" + e);
    }
}

function 获取正确选项(题目) {
    return 题库[题目] || null;
}

function 点击选项(字母) {
    let 选项列表 = id("com.huayi.cme:id/rl_cheack_item_quest_single_top").find();
    for (let i = 0; i < 选项列表.length; i++) {
        let 父布局 = 选项列表[i];
        let 文字控件 = 父布局.findOne(id("com.huayi.cme:id/tv_item_quest_single_zimu"));
        if (文字控件 && 文字控件.text().trim().startsWith(字母)) {
            父布局.click();
            sleep(200);
            return true;
        }
    }
    log("未找到选项：" + 字母);
    return false;
}

function 清洗题目(str) {
    str = str.split("【")[0].trim();
    str = str.replace(/^(单选|多选|判断)?\s*\d+[、.\s]+/i, "").trim();
    return str;
}

function 提取答案字母(str) {
    let m = str.match(/【您的答案：([A-E])/);
    return m ? m[1] : null;
}

function 识别对错并更新题库() {
    sleep(1000);
    let screen = captureScreen();
    let resultIcons = id("iv_item_test_result_weitongguo").find();
    if (resultIcons.length === 0) {
        screen.recycle();
        return;
    }
    for (let i = 0; i < resultIcons.length; i++) {
        let icon = resultIcons[i];
        let bounds = icon.bounds();
        let hasGreen = false, hasRed = false;
        for (let x = bounds.left; x < bounds.right; x++) {
            for (let y = bounds.top; y < bounds.bottom; y++) {
                let color = images.pixel(screen, x, y);
                let r = colors.red(color), g = colors.green(color), b = colors.blue(color);
                if (g > r + 40 && g > b + 40) { hasGreen = true; x = 9999; y = 9999; break; }
                if (r > g + 40 && r > b + 40) { hasRed = true; x = 9999; y = 9999; break; }
            }
        }
        let 题目区域 = icon.parent().findOne(id("tv_item_title"));
        if (!题目区域) continue;
        let 完整题目 = 题目区域.text().trim();
        let 正确选项 = 提取答案字母(完整题目);
        if (hasGreen && 正确选项) {
            let 纯题干 = 清洗题目(完整题目);
            题库[纯题干] = 正确选项;
            log("记录题目：" + 纯题干 + " → " + 正确选项);
        }else{
            log("无正确答案记录");
        }
    }
    保存题库();
    screen.recycle();
}

// ==============================================
// 考试相关
// ==============================================
function 开始做题() {
    while (true) {
        sleep(300);
        let 题目控件 = id("com.huayi.cme:id/tv_quest_single_title").findOne(2500);
        if (!题目控件) { log("未找到题目，结束"); break; }
        let 当前题目Raw = 题目控件.text().trim();
        let 当前题目 = 清洗题目(当前题目Raw);
        if (当前题目 === 上一题文字) {
            log("题目重复，交卷");
            let 交卷 = id("com.huayi.cme:id/tv_answer_question_jiaojuan").findOne(2000);
            if (交卷) { 交卷.click(); sleep(2000); }
            break;
        }
        上一题文字 = 当前题目;
        let 正确选项 = 获取正确选项(当前题目);
        if (正确选项) {
            log("匹配题库：" + 正确选项);
            点击选项(正确选项);
        } else {
            log("无题，默认选：" + 当前选项字母);
            点击选项(当前选项字母);
        }
        sleep(800);
        let 下一题 = id("com.huayi.cme:id/btn_nextquestions").findOne(3000);
        if (下一题) 下一题.click();
    }
}

function do_test() {
    考试次数 = 0;
    while (考试次数 < 最大考试次数) {
        考试次数++;
        log("第" + 考试次数 + "次考试");
        开始做题();
        sleep(2000);
        let 未通过 = textContains("考试未通过").findOne(5000);
        if (!未通过) {
            log("考试通过！");
            let 完成 = id("com.huayi.cme:id/btn_test_result_left").findOne(3000);
            if (完成) 完成.click();
            break;
        }        
        log("未通过，收集答案...");
        识别对错并更新题库();
        if (考试次数 >= 最大考试次数) { log("达到最大次数"); return; }
        let 重考 = id("com.huayi.cme:id/btn_test_result_right").findOne(3000);
        if (重考) { 重考.click(); sleep(3500); }
        当前选项字母 = 下一个字母(当前选项字母);
        上一题文字 = "";
    }
}

function test_card() {
    let targetList = textMatches(/.*待考试.*/).find();
    if (targetList.length === 0) { log("无待考试"); return; }
    log("找到" + targetList.length + "个待考");
    sleep(1500);
    for (let i = 0; i < targetList.length; i++) {
        let view = targetList[i];
        let card = null;
        let temp = view;
        for (let k = 0; k < 8; k++) {
            if (!temp) break;
            if (temp.id() === "com.huayi.cme:id/rl_item_course_detail") {
                card = temp; break;
            }
            temp = temp.parent();
        }
        if (!card) { log("找不到卡片，跳过"); continue; }
        log("打开第" + (i + 1) + "个");
        card.click(); sleep(5000);
        if (textContains("请点击左下角“考试”按钮参加课后测试").exists()) {
            log("✅ 检测到考试提示");
            id("com.huayi.cme:id/btnAlertDialogConfirm").click();
        }
        if (id("rl_video_kaoshi").exists()) id("rl_video_kaoshi").click();
        do_test();   
        sleep(2500);
        targetList = textMatches(/.*待考试.*/).find();
    }
    log("全部考试完成");
}

function auto_test() {
    let courses = id("com.huayi.cme:id/ll_mylike_course").find();
    if (courses.length === 0) { log("无课程"); return; }
    log("找到" + courses.length + "个课程");
    for (let i = 0; i < courses.length; i++) {
        courses[i].click(); sleep(2000);
        for (let k = 0; k < 3; k++) {
            if (textContains("待考试").exists()) {
                test_card();
            } else {
                back(); sleep(1000);
                break
            }
        }
        courses = id("com.huayi.cme:id/ll_mylike_course").find();
    }
}

// ==============================================
// 视频学习（自动静音）
// ==============================================
function showTimeText() {
    try {
        let node = id("com.huayi.cme:id/rl_play").findOne(200);
        if (node) {
            let b = node.bounds();
            click((b.left + b.right) / 2, (b.top + b.bottom) * 2 / 3);
        }
    } catch (e) { }
    sleep(1000);
}

function handleClassThinking() {
    if (!textContains("课堂思考").exists()) return;
    log("处理课堂思考");
    let tryCount = 0;
    while (textContains("课堂思考").exists() && tryCount < 5) {
        tryCount++;
        let options = id("com.huayi.cme:id/rl_cheack_item_quest_single_top").find();
        if (options.length < 2) return;
        options[tryCount % 2].click(); sleep(300);
        id("com.huayi.cme:id/btn_middle_question_comit").click(); sleep(1000);
    }
    let ok = id("com.huayi.cme:id/btnAlertDialogConfirm").findOne(3000);
    if (ok) ok.click();
}

function 关闭温馨提示() {
    if (!textContains("温馨提示").exists()) return;
    log("关闭温馨提示");    
    let ok = id("com.huayi.cme:id/btn_confirm_Positive").findOne(1000);
    if (ok) ok.click();
}

/**
 * 播放视频并监控完成状态
 */
function play_video() {
    开启静音(); // 自动静音
    const MAX_WAIT_SECONDS = 7000;
    let startTime = new Date().getTime();
    let lastPercent = 0;

    while (true) {
        let now = new Date().getTime();
        let costSeconds = (now - startTime) / 1000;
        if (costSeconds >= MAX_WAIT_SECONDS) {
            log("⏰ 等待超时，自动退出");
            back();
            break;
        }
        log(`⏱ 已等待 ${Math.floor(costSeconds)} 秒`);

        if (text("当前为移动网络，是否继续播放？").exists()) {
            log("✅ 检测到：当前为移动网络，自动点击继续");
            id("android:id/button1").click();
        }
        handleClassThinking();
        关闭温馨提示()
        showTimeText();

        // 检测完成文字
        if (text("本课件已学习完毕").exists()) {
            log("✅ 检测到：本课件已学习完毕");
            id("com.huayi.cme:id/btn_test_result_left").click();
            log("✅ 返回上一页");
            break;
        }
        if (textContains("请点击左下角“考试”按钮参加课后测试").exists()) {
            log("✅ 检测到考试提示");
            id("com.huayi.cme:id/btnAlertDialogConfirm").click();
            sleep(500);
            back();
            break;
        }

        let playDuration = id("com.huayi.cme:id/playDuration").findOne(2000);
        let videoDuration = id("com.huayi.cme:id/videoDuration").findOne(2000);
        if (!playDuration || !videoDuration) {
            log("⚠️ 未找到时间文本，继续等待...");
            sleep(10 * 1000);
            continue;
        }

        let playText = playDuration.text();
        let videoText = videoDuration.text();
        let playSec = timeToSeconds(playText);
        let videoSec = timeToSeconds(videoText);

        if (videoSec <= 0) {
            sleep(2000);
            continue;
        }

        let percent = playSec / videoSec;
        log(`当前进度：${(percent * 100).toFixed(2)}% (${playText}/${videoText})`);

        // 进度回退 → 播放完成（循环播放）
        if (lastPercent > 0 && percent < lastPercent) {
            log("✅ 检测到进度倒退，视频已播放完毕");
            back();
            break;
        }

        if (percent >= 0.999 || playSec >= videoSec) {
            log("✅ 视频即将播放完成，等待10秒后退出");
            sleep(10 * 1000);
            if (text("本课件已学习完毕").exists()) {
                id("com.huayi.cme:id/btn_test_result_left").click();
            } else {
                back();
            }
            break;
        }

        lastPercent = percent;
        sleep(10 * 1000);
    }
    sleep(1000);
}

function study_card() {
    let targetList = textMatches(/.*(未学习|播放至).*/).find();
    if (targetList.length === 0) { log("无未学习"); return; }
    log("找到" + targetList.length + "个未学");
    sleep(1500);
    for (let i = 0; i < targetList.length; i++) {
        let view = targetList[i];
        let card = null;
        let temp = view;
        for (let k = 0; k < 8; k++) {
            if (!temp) break;
            if (temp.id() === "com.huayi.cme:id/rl_item_course_detail") {
                card = temp; break;
            }
            temp = temp.parent();
        }
        if (!card) { log("跳过"); continue; }
        
        // 检查卡片内是否包含“互动病例演练”文本，若包含则跳过
        let hasInteractive = card.findOne(text("互动病例演练"));
        if (hasInteractive) {
            log("跳过互动病例演练"); 
            continue;
        }
        
        card.click(); sleep(3000);
        // play_video();
        // sleep(2500);
        targetList = textMatches(/.*(未学习|播放至).*/).find();
    }
}


function auto_study() {
    let courses = id("com.huayi.cme:id/ll_mylike_course").find();
    if (courses.length === 0) { log("无课程"); return; }
    for (let i = 0; i < courses.length; i++) {
        courses[i].click(); sleep(2000);
        for (let k = 0; k < 3; k++) {
            if (textContains("未学习").exists() || textContains("播放至").exists()) {
                study_card();
            } else {
                back(); sleep(1000);
                break
            }
        }
        // courses = id("com.huayi.cme:id/ll_mylike_course").find();
    }
}

// ==============================================
// 启动与权限
// ==============================================
function ScreenCapture() {
    setScreenMetrics(device.width, device.height);
    if (!requestScreenCapture()) { log("截图权限失败"); exit(); }
    log("截图权限OK");
    sleep(1000);
}

function start_app() {
    log("启动掌上华医");
    if (!launchApp("掌上华医")) { log("未安装掌上华医"); return false; }
    log("正在启动，请稍等5秒...");
    sleep(5*1000);
    for (let i = 0; i < 5; i++) {
        if (id("iv_home_sys").exists()) { log("已到主页"); break; }
        back(); sleep(500);
    }
    if (!id("iv_home_sys").exists()) { log("未找到主页"); return false; }
    if (className("android.widget.TextView").text("我的").exists()) {
        className("android.widget.TextView").text("我的").findOne().parent().parent().click();
        sleep(1500);
    } else { log("未找到我的"); return false; }
    if (className("android.widget.TextView").text("我的收藏").exists()) {
        className("android.widget.TextView").text("我的收藏").findOne().parent().click();
        sleep(1500);
        return true;
    } else { log("未找到收藏"); return false; }
}




study_card()
