/**
 * @Description: AutoX.js 掌上华医自动学习考试脚本(重写答题模块，新增考试通过后写入题库功能，新增考试未通过后清空题库功能，新增考试结果识别逻辑，新增实时答题缓存机制，优化日志输出和界面交互)
 * @version: 2.2.1
 * @Author: UnaAtadura
 * @Date: 2026.05.04 16:08
 */

// ==============================================
// 配置
// ==============================================
let yinLiang = 0;
let floatyWindow = null;
let logText = "";
let exitListenerRegistered = false;
let 题库 = 读取题库();
let 上一题文字 = "";
let 当前选项字母 = "A";
let 考试次数 = 0;
let 本次答题缓存 = []; // 新增：实时缓存本次考试的题目+选择的答案
const 题库文件路径 = files.path("./考试题库.json");
const 最大考试次数 = 6;
// 重写 log 函数，同时输出到控制台和悬浮窗
const originalLog = log;
log = function (msg) {
    originalLog(msg);
    appendLog(String(msg));
};


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
    h = device.height; //屏幕高
    w = device.width; //屏幕宽
    x = (w / 3) * 2;
    h1 = (h / 6) * 5;
    h2 = (h / 6);
    swipe(x, h1, x, h2, 500);
    log("✅ 执行上滑动作");//如果对错图标没出现在屏幕会导致获取控件高度失败，所以执行上滑尽量显示图标
  
    // 找对错图标
    let resultIcons = id("iv_item_test_result_weitongguo").find();

    for (let i = 0; i < resultIcons.length; i++) {
        let icon = resultIcons[i];
        let bounds = icon.bounds();
        
        // ======================================
        // 核心：根据高度判断 对/错
        // ======================================
        let height = bounds.height(); // 获取控件高度
        let isRight = false;

        if (height === 21) {
            isRight = true;  // 高度21 = 答对 ✅
            log("第"+(i+1)+"题：高度21 → 正确");
        } else if (height === 26) {
            isRight = false; // 高度26 = 答错 ❌
            log("第"+(i+1)+"题：高度26 → 错误");
        } else {
            log("第"+(i+1)+"题：未知高度("+height+")，跳过");
            continue;
        }

        // 找题目
        let 题目区域 = icon.parent().findOne(id("tv_item_title"));
        if (!题目区域) continue;
        
        let 完整题目 = 题目区域.text().trim();
        let 正确选项 = 提取答案字母(完整题目);

        // ======================================
        // 只有正确才记录到题库
        // ======================================
        if (isRight && 正确选项) {
            let 纯题干 = 清洗题目(完整题目);
            题库[纯题干] = 正确选项;
            log("记录题目：" + 纯题干 + " → " + 正确选项);
        } else {
            log("此题不记录（错误/无答案）");
        }
    }

    保存题库();
}

// ==============================================
// 重写后的做题模块：实时缓存题目+所选答案
// ==============================================
function 开始做题() {
    本次答题缓存 = []; // 每次开始做题，先清空上一次的缓存
    上一题文字 = "";

    while (true) {
        sleep(300);
        // 1. 找到当前题目
        let 题目控件 = id("com.huayi.cme:id/tv_quest_single_title").findOne(2500);
        if (!题目控件) { 
            log("未找到题目，结束答题"); 
            break; 
        }

        // 2. 清洗题干，和题库key保持完全一致
        let 当前题目Raw = 题目控件.text().trim();
        let 当前题目 = 清洗题目(当前题目Raw);

        // 3. 题目重复=已经答完，触发交卷
        if (当前题目 === 上一题文字) {
            log("题目重复，执行交卷");
            let 交卷 = id("com.huayi.cme:id/tv_answer_question_jiaojuan").findOne(2000);
            if (交卷) { 
                交卷.click(); 
                sleep(2000); 
            }
            break;
        }
        上一题文字 = 当前题目;

        // 4. 匹配题库/选择默认选项
        let 本次选择的选项 = 获取正确选项(当前题目);
        if (!本次选择的选项) {
            本次选择的选项 = 当前选项字母;
            log("无题库存，默认选：" + 本次选择的选项);
        } else {
            log("匹配题库成功，选：" + 本次选择的选项);
        }

        // 5. 点击选项
        点击选项(本次选择的选项);

        // 6. 核心：缓存本题的题干+所选答案（考试通过后用这个写入题库）
        本次答题缓存.push({
            题干: 当前题目,
            所选答案: 本次选择的选项
        });
        log("已缓存题目：" + 当前题目 + " → " + 本次选择的选项);

        // 7. 点击下一题
        sleep(800);
        let 下一题 = id("com.huayi.cme:id/btn_nextquestions").findOne(3000);
        if (下一题) 下一题.click();
    }
}

// ==============================================
// 重写后的考试主逻辑：通过/未通过双场景适配
// ==============================================
function do_test() {
    考试次数 = 0;
    while (考试次数 < 最大考试次数) {
        考试次数++;
        log("===== 第" + 考试次数 + "次考试 =====");
        
        // 开始答题
        开始做题();
        sleep(2000);

        // ======================================
        // 场景1：考试通过 → 用缓存写入题库
        // ======================================
        let 考试通过 = textContains("考试通过").findOne(3000);
        if (考试通过) {
            log("✅ 考试通过！开始写入本次答题记录到题库");
            
            // 遍历本次答题缓存，只新增题库里没有的题目
            let 新增题目数 = 0;
            for (let i = 0; i < 本次答题缓存.length; i++) {
                let 答题记录 = 本次答题缓存[i];
                // 题库里没有这道题，才写入
                if (!题库[答题记录.题干]) {
                    题库[答题记录.题干] = 答题记录.所选答案;
                    新增题目数++;
                    log("新增题库：" + 答题记录.题干 + " → " + 答题记录.所选答案);
                }
            }

            // 保存题库到文件
            保存题库();
            log(`✅ 本次考试新增 ${新增题目数} 道题到题库，题库更新完成`);

            // 点击返回，结束考试
            let 完成按钮 = id("com.huayi.cme:id/btn_test_result_left").findOne(3000);
            if (完成按钮) 完成按钮.click();
            break;
        }

        // ======================================
        // 场景2：考试未通过 → 原有的对错识别+题库更新逻辑
        // ======================================
        let 考试未通过 = textContains("考试未通过").findOne(3000);
        if (考试未通过) {
            log("❌ 考试未通过，开始识别正确答案并更新题库");
            识别对错并更新题库();

            // 超过最大考试次数，清空题库
            if (考试次数 >= 最大考试次数) { 
                log("达到最大考试次数，开始清空题库...");
                题库 = {}; 
                files.write(题库文件路径, JSON.stringify(题库, null, 2)); 
                log("✅ 题库已清空！");
                return; 
            }

            // 点击重新考试
            let 重考按钮 = id("com.huayi.cme:id/btn_test_result_right").findOne(3000);
            if (重考按钮) { 
                重考按钮.click(); 
                sleep(3500); 
            }

            // 切换下一个默认选项，循环盲选
            当前选项字母 = 下一个字母(当前选项字母);
            log("下次考试默认选项切换为：" + 当前选项字母);
            continue;
        }

        // 异常情况：既没识别到通过也没识别到未通过，退出循环
        log("⚠️ 未识别到考试结果，退出本次考试");
        break;
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
        card.click(); 
        if (textContains("请点击左下角“考试”按钮参加课后测试").findOne(20*1000)) {
            log("✅ 检测到考试提示");
            id("com.huayi.cme:id/btnAlertDialogConfirm").click();
            sleep(500);
        }
        if (id("rl_video_kaoshi").findOne(5*1000)) id("rl_video_kaoshi").click();
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
                back();
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
        // showTimeText();

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

        // let playDuration = id("com.huayi.cme:id/playDuration").findOne(2000);
        // let videoDuration = id("com.huayi.cme:id/videoDuration").findOne(2000);
        // if (!playDuration || !videoDuration) {
        //     log("⚠️ 未找到时间文本，继续等待...");
        //     sleep(10 * 1000);
        //     continue;
        // }

        // let playText = playDuration.text();
        // let videoText = videoDuration.text();
        // let playSec = timeToSeconds(playText);
        // let videoSec = timeToSeconds(videoText);

        // if (videoSec <= 0) {
        //     sleep(2000);
        //     continue;
        // }

        // let percent = playSec / videoSec;
        // log(`当前进度：${(percent * 100).toFixed(2)}% (${playText}/${videoText})`);

        // 进度回退 → 播放完成（循环播放）
        // if (lastPercent > 0 && percent < lastPercent) {
        //     log("✅ 检测到进度倒退，视频已播放完毕");
        //     back();
        //     break;
        // }

        // if (percent >= 0.99999 || playSec >= videoSec) {
        //     log("✅ 视频即将播放完成，等待10秒后退出");
        //     sleep(10 * 1000);
        //     if (text("本课件已学习完毕").exists()) {
        //         id("com.huayi.cme:id/btn_test_result_left").click();
        //     } else {
        //         back();
        //     }
        //     break;
        // }

        // lastPercent = percent;
        sleep(60 * 1000);
    }
    sleep(1000);
}

function study_card() {
    log("=== 开始学习未学习课程===");
    
    // 循环：一直找，直到没有符合条件的课程
    while (true) {
        // 每次都重新获取所有卡片（关键！）
        let allCards = id("com.huayi.cme:id/rl_item_course_detail").find();
        let foundValidCard = false;

        // 遍历找【第一个】符合条件的
        for (let i = 0; i < allCards.length; i++) {
            let card = allCards[i];
            let textViews = card.find(className("android.widget.TextView"));
            let hasUnstudy = false;
            let hasInteractive = false;

            for (let j = 0; j < textViews.length; j++) {
                let t = textViews[j].text().trim();
                if (t.includes("未学习")|| t.includes("播放至") ) hasUnstudy = true;
                if (t.includes("互动病例演练")) hasInteractive = true;
            }

            // 满足条件：未学习 且 不是互动病例
            if (hasUnstudy && !hasInteractive) {
                log("✅ 找到有效未学习课程，开始学习");
                card.click();
                sleep(1000);     
                play_video();
                // log("✅ 假装学完");
                sleep(1000);                
                foundValidCard = true;
                break; // 学完一个，立刻重新找下一个
            }
        }

        // 再也找不到了，退出
        if (!foundValidCard) {
            log("=== 所有未学习课程已完成 ===");
            back();sleep(1000);  
            break;
        }
    }
}

function auto_study() {
    const courseId = "com.huayi.cme:id/ll_mylike_course";
    let courses = id(courseId).find();
    if (courses.length === 0) {
        log("未找到任何课程");
        return;
    }
    log("找到 " + courses.length + " 个课程");
    for (let i = 0; i < courses.length; i++) {
        log("正在打开第 " + (i + 1) + " 个课程");
        courses[i].click();
        sleep(2000);
        study_card(); 
        // 重新获取课程列表，避免界面刷新导致控件失效
        courses = id(courseId).find();
    }
    log("✅ 所有课程检查完成");
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


// ==============================================
// 主函数
// ==============================================

function main() {
    auto.waitFor();
    ScreenCapture();
    console.show();
    let originalVolume = device.getMusicVolume();
    log("开启静音");
    device.setMusicVolume(0);    
    let startTime = new Date().getTime();
    if (!start_app()) {
        log("启动失败，退出");
        engines.stopAll();
        return;
    }
    // 可根据需要选择执行学习或考试
    auto_study();   // 先学习
    auto_test(); // 需要考试时取消注释

    let endTime = new Date().getTime();
    log("运行结束，共耗时" + (parseInt(endTime - startTime)) / 1000 + "秒");
    log("恢复原来音量:" + originalVolume);
    device.setMusicVolume(originalVolume);

    threads.shutDownAll();
    console.hide();
    engines.stopAll();
}

// main();

// auto_test()