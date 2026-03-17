/**代码原作者
 * @Description: AutoX.js Ai-huayi 
 * @version: 1.1.2
 * @Author: UnaAtadura
 * @Date: 2026.03.15
 */
// ==============================================
// 配置
// ==============================================
const 题库文件路径 = files.path("./考试题库.json");
var 题库 = {};
var 上一题文字 = "";
var 当前选项字母 = "A";
var 考试次数 = 0;
const 最大考试次数 = 5;
题库 = 读取题库();







// ============================== 考试相关函数 ==============================

/**
 * @description: 遍历考试
 * @param: null
 * @return: null
 */
function auto_test() {
    // 要查找的课程ID
    const courseId = "com.huayi.cme:id/ll_mylike_course";
    // 1. 找到所有课程
    let courses = id(courseId).find();
    if (courses.length === 0) {
        console.log("未找到任何课程");
        exit();
    }
    console.log("找到 " + courses.length + " 个课程");

    // 2. 依次遍历每个课程
    for (let i = 0; i < courses.length; i++) {
        console.log("正在打开第 " + (i + 1) + " 个课程");

        // 点击当前课程
        courses[i].click();
        sleep(2000); // 等待页面加载

        // 3. 检查是否存在【待考试】或【播放至】字样
        let hasTest = textContains("待考试").exists() || descContains("待考试").exists();

        if (hasTest) {
            console.log("✅ 该课程未考试，不返回");
            log("准备考试")
            do_test()
        } else {
            console.log("✅ 该课程已考试完毕，返回");
            back(); // 返回列表
            sleep(1000);
        }

        // 重新加载课程列表（避免返回后控件失效）
        courses = id(courseId).find();
    }

    console.log("✅ 所有课程检查完成");
}
// ==============================================
// 做题函数
// ==============================================

/**
 * @description: 开始做题
 * @param: null
 * @return: null
 */
function do_test() {
    // ==============================================
    // 主考试循环
    // ==============================================
    while (考试次数 < 最大考试次数) {
        考试次数++;
        log("开始第 " + 考试次数 + " 次考试");
        开始做题();

        sleep(2000);
        var 未通过 = textContains("考试未通过").findOne(5000);

        if (!未通过) {
            log("✅ 第" + 考试次数 + "次考试通过！");
            id("com.huayi.cme:id/btn_test_result_left").findOne().click();
        }

        if (考试次数 >= 最大考试次数) {
            log("已达到最大考试次数(" + 最大考试次数 + "次)，停止");
            exit();
        }

        log("❌ 未通过，收集正确答案...");
        识别对错并更新题库();

        log("🔄 准备重考");
        id("com.huayi.cme:id/btn_test_result_right").findOne().click();
        sleep(3500);

        当前选项字母 = 下一个字母(当前选项字母);
        log("下次默认选：" + 当前选项字母);
        上一题文字 = "";
    }
}


function 开始做题() {
    while (true) {
        sleep(300);

        var 题目控件 = id("com.huayi.cme:id/tv_quest_single_title").findOne(2500);
        if (!题目控件) {
            log("未找到题目，结束本轮");
            break;
        }

        var 当前题目Raw = 题目控件.text().trim();
        log("原始题目：" + 当前题目Raw);

        // 🔥【核心修复】：清洗题目，只保留纯题干
        var 当前题目 = 清洗题目(当前题目Raw);
        log("清洗后题干：" + 当前题目);

        if (当前题目 == 上一题文字) {
            log("题目无变化 → 交卷");
            id("com.huayi.cme:id/tv_answer_question_jiaojuan").findOne().click();
            sleep(2000);
            break;
        }
        上一题文字 = 当前题目;

        var 正确选项 = 获取正确选项(当前题目);

        if (正确选项) {
            log("题库存在 → 选：" + 正确选项);
            点击选项(正确选项);
        } else {
            log("题库无题 → 选：" + 当前选项字母);
            点击选项(当前选项字母);
        }

        sleep(800);
        id("com.huayi.cme:id/btn_nextquestions").findOne().click();
    }
}

// ==============================================
// 🔥 新增：清洗题目函数（只保留题干，去掉后缀）
// 🔥 终极清洗：去掉 单选1、 2、 3. 等所有前缀，只保留纯题干
function 清洗题目(str) {
    // 第一步：删掉末尾 【您的答案:xxx】 所有内容
    str = str.split("【")[0].trim();

    // 第二步：删掉开头所有前缀：单选1、 多选2、 3、 4. 等
    str = str.replace(/^(单选|多选|判断)?\s*\d+[、.\s]+/i, "").trim();

    return str;
}

// ==============================================
// 以下功能不变
// ==============================================
function 读取题库() {
    try {
        if (files.exists(题库文件路径)) {
            var str = files.read(题库文件路径);
            return JSON.parse(str);
        }
    } catch (e) { }
    return {};
}

function 保存题库() {
    try {
        files.write(题库文件路径, JSON.stringify(题库, null, 2));
    } catch (e) { }
}

function 获取正确选项(题目) {
    return 题库[题目] || null;
}

function 点击选项(字母) {
    var 选项列表 = id("com.huayi.cme:id/rl_cheack_item_quest_single_top").find();
    for (var i = 0; i < 选项列表.length; i++) {
        var 父布局 = 选项列表[i];
        var 文字 = 父布局.findOne(id("com.huayi.cme:id/tv_item_quest_single_zimu"));
        if (文字 && 文字.text().trim().startsWith(字母)) {
            父布局.click();
            sleep(200);
            return;
        }
    }
}

function 识别对错并更新题库() {
    sleep(1000);
    var screen = captureScreen();
    var resultIcons = id("iv_item_test_result_weitongguo").find();

    if (resultIcons.length == 0) {
        log("未找到结果图标");
        screen.recycle();
        return;
    }

    for (var i = 0; i < resultIcons.length; i++) {
        var icon = resultIcons[i];
        var bounds = icon.bounds();
        var hasGreen = false;
        var hasRed = false;

        for (var x = bounds.left; x < bounds.right; x++) {
            for (var y = bounds.top; y < bounds.bottom; y++) {
                var color = images.pixel(screen, x, y);
                var r = colors.red(color);
                var g = colors.green(color);
                var b = colors.blue(color);

                if (g > r + 40 && g > b + 40) {
                    hasGreen = true;
                    x = 9999; y = 9999; break;
                }
                if (r > g + 40 && r > b + 40) {
                    hasRed = true;
                    x = 9999; y = 9999; break;
                }
            }
        }

        var 题目区域 = icon.parent().findOne(id("tv_item_title"));
        if (!题目区域) continue;
        var 完整题目 = 题目区域.text().trim();
        var 正确选项 = 提取答案字母(完整题目);

        if (hasGreen && 正确选项) {
            // 🔥 这里存的也是纯题干，保证一致性
            var 纯题干 = 清洗题目(完整题目);
            题库[纯题干] = 正确选项;
            log("记录纯题干：" + 纯题干 + " -> " + 正确选项);
        }
    }

    保存题库();
    screen.recycle();
    log("题库更新完成");
}

function 提取答案字母(str) {
    var m = str.match(/【您的答案：([A-E])/);
    return m ? m[1] : null;
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









/**
 * @description: 遍历考试章节
 * @param: null
 * @return: null
 */
function test_card() {
    // 匹配包含“待考试”的控件
    let targetList = textMatches(/.*待考试.*/).find();

    if (targetList.length === 0) {
        console.log("没有需要考试的课程");
        exit();
    }

    console.log("找到 " + targetList.length + " 个考试");
    sleep(1500);

    for (let i = 0; i < targetList.length; i++) {
        let view = targetList[i];
        let card = null;
        let temp = view;

        // 安全向上查找父控件，直到找到课程卡片ID
        for (let k = 0; k < 8; k++) { // 最多向上找8层，避免死循环
            if (!temp) break; // 关键：如果temp为null，立刻终止查找
            if (temp.id() === "com.huayi.cme:id/rl_item_course_detail") {
                card = temp;
                break;
            }
            temp = temp.parent(); // 只有temp不为null时才调用parent
        }

        if (!card) {
            log("第" + (i + 1) + "个：找不到考试卡片，跳过");
            continue;
        }

        // 点击进入考试
        console.log("打开第 " + (i + 1) + " 个考试");
        card.click();
        sleep(2000);
        if (id("rl_video_kaoshi").exists()) {
            id("rl_video_kaoshi").click();
        }
        console.log("开始考试...");
        //.............................................................


        // 返回列表
        // back();
        sleep(2500);

        // 重新获取控件列表，防止页面刷新导致控件失效
        targetList = textMatches(/.*待考试.*/).find();
    }

    console.log("全部考试处理完成！");
}




// ============================== 刷视频相关函数 ==============================

// 显示进度条：点击视频区域
function showTimeText() {
    try {
        // ============== 用【控件坐标】点击（适配所有手机）==============
        let node = id("com.huayi.cme:id/rl_play").findOne(200);
        if (node) {
            // 取出控件坐标，计算中心点
            let bounds = node.bounds();
            let x = (bounds.left + bounds.right) * 9 / 10;
            let y = (bounds.top + bounds.bottom) / 2;
            // 用控件坐标点击
            click(x, y);
            log("通过控件坐标点击成功，弹出进度条");
        }
        sleep(1000);
    } catch (e) {
        // 异常不崩溃，打印错误日志
        log("❌ 点击失败：" + e);
        // 失败后重试1次
        sleep(300);
        click(device.width * 7 / 10, device.height / 5);
    }
}


/**
 * @description: 检测视频完成播放及课堂问答
 * @param: null
 * @return: null
 */
function play_video() {
    // 最大等待时间：1小时（3600秒）
    const MAX_WAIT_SECONDS = 4000;
    let startTime = new Date().getTime();

    // 🔥 记录上一次进度
    let lastPercent = 0;

    while (true) {
        try {
            // 1. 判断是否有课堂问答
            handleClassThinking()
            // 1. 判断是否超过1小时
            let now = new Date().getTime();
            let costSeconds = (now - startTime) / 1000;
            if (costSeconds >= MAX_WAIT_SECONDS) {
                log("⏰ 已等待1小时，自动退出");
                log("⏰ 等待超时，脚本结束");
                back();
                break;
            }
            log(`⏱ 已等待 ${Math.floor(costSeconds)} 秒`);

            // 2. 唤醒播放界面
            showTimeText();
            // ============================
            // 【触发条件1：出现完成文字】
            // ============================
            let finishText = text("本课件已学习完毕").findOne(1000);
            if (finishText) {
                log("✅ 检测到：本课件已学习完毕");
                id("com.huayi.cme:id/btn_test_result_left").click();
                log("✅ 返回上一页");
                break;
            }
            let finishText2 = text("请点击左下角“考试”按钮参加课后测试，通过后即为学完本课件。").findOne(1000);
            if (finishText2) {
                log("✅ 检测到：“考试”按钮");
                id("com.huayi.cme:id/btnAlertDialogConfirm").click();
                sleep(500)
                log("✅ 返回上一页");
                back();
                break;
            }

            // 3. 获取时间文本
            let playDuration = id("com.huayi.cme:id/playDuration").findOne(2000);
            let videoDuration = id("com.huayi.cme:id/videoDuration").findOne(2000);
            if (!playDuration || !videoDuration) {
                log("⚠️ 未找到时间文本，继续等待...");
                sleep(2000);
                continue;
            }

            // 4. 解析时间
            let playText = playDuration.text();
            let videoText = videoDuration.text();
            let playSec = timeToSeconds(playText);
            let videoSec = timeToSeconds(videoText);

            if (videoSec <= 0) {
                log("⚠️ 时间无效，继续等待...");
                sleep(2000);
                continue;
            }

            // 5. 计算进度
            let percent = playSec / videoSec;
            log(`当前进度：${(percent * 100).toFixed(2)}% (${playText}/${videoText})`);

            // ==============================================
            // 🔥 最终逻辑：上一次 > 当前 = 播放完成
            // ==============================================
            if (lastPercent > 0 && percent < lastPercent) {
                log("✅ 检测到进度倒退，视频已播放完毕，自动退出");
                log("✅ 视频已完成");
                back();
                break;
            }

            // ============================
            // 【触发条件2：播放完成】
            // ============================
            if (percent >= 0.999 || playSec >= videoSec) {
                log("✅ 视频即将播放完成,等待5秒后退出");
                sleep(5 * 1000);
                if (text("本课件已学习完毕").exists()) {
                    log("✅ 检测到：本课件已学习完毕");
                    id("com.huayi.cme:id/btn_test_result_left").click();
                    log("✅ 返回上一页");
                } else {
                    back();
                    log("✅ 返回上一页");
                }
                break;
            }

            // 保存本次进度
            lastPercent = percent;

        } catch (e) {
            log("⚠️ 异常，继续运行：" + e);
        }
        sleep(10000);
    }
}

// 时间字符串转秒数
function timeToSeconds(timeStr) {
    if (!timeStr || timeStr.indexOf(":") === -1) return 0;
    let parts = timeStr.split(":").map(Number);
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
}


/**
 * @description: 循环检查并处理课堂思考
 * @param: null
 * @return: null
 */
function handleClassThinking() {
    // 没有课堂思考直接结束
    if (!textContains("课堂思考").exists()) {
        console.log("✅ 无课堂思考，结束处理");
        return;
    }

    console.log("🔍 发现课堂思考，开始自动答题...");
    const QUESTION_ITEM_ID = "com.huayi.cme:id/rl_cheack_item_quest_single_top";
    const SUBMIT_BTN_ID = "com.huayi.cme:id/btn_middle_question_comit";

    // 最多循环5次
    const MAX_TRY = 5;
    let tryCount = 0;

    // 循环答题
    while (textContains("课堂思考").exists() && tryCount < MAX_TRY) {
        tryCount++;
        console.log(`\n===== 第 ${tryCount} 次尝试 =====`);

        // 获取选项
        let options = id(QUESTION_ITEM_ID).find();
        if (options.length < 2) {
            console.log("⚠️ 选项不足2个，无法切换，退出");
            return;
        }

        // ======================================
        // 核心逻辑：奇数次选第1个，偶数次选第2个
        // ======================================
        let selectIndex = tryCount % 2 === 1 ? 0 : 1;
        let option = options.get(selectIndex);

        // 直接点击，不判断选中
        option.click();
        console.log(`📝 已选择第 ${selectIndex + 1} 个选项`);
        sleep(300);

        // 提交
        id(SUBMIT_BTN_ID).click();
        console.log("✅ 已提交答案");
        sleep(1000); // 等待页面刷新

        // 检查是否答对
        if (!textContains("课堂思考").exists()) {
            console.log(`🎉 答题成功！共尝试 ${tryCount} 次`);
            id("com.huayi.cme:id/btnAlertDialogConfirm").findOne(3000)?.click();
            return;
        }

        console.log(`❌ 答案错误，继续尝试...`);
    }

    // 超过次数退出
    if (tryCount >= MAX_TRY) {
        console.log("⚠️ 已达到最大尝试次数（5次），停止答题");
    }
}


/**
 * @description: 遍历章节
 * @param: null
 * @return: null
 */
function study_card() {
    // 匹配包含“未学习”或“播放至”的控件
    let targetList = textMatches(/.*(未学习|播放至).*/).find();

    if (targetList.length === 0) {
        console.log("没有需要学习的课程");
        exit();
    }

    console.log("找到 " + targetList.length + " 个未完成课程");
    sleep(1500);

    for (let i = 0; i < targetList.length; i++) {
        let view = targetList[i];
        let card = null;
        let temp = view;

        // 安全向上查找父控件，直到找到课程卡片ID
        for (let k = 0; k < 8; k++) { // 最多向上找8层，避免死循环
            if (!temp) break; // 关键：如果temp为null，立刻终止查找
            if (temp.id() === "com.huayi.cme:id/rl_item_course_detail") {
                card = temp;
                break;
            }
            temp = temp.parent(); // 只有temp不为null时才调用parent
        }

        if (!card) {
            log("第" + (i + 1) + "个：找不到课程卡片，跳过");
            continue;
        }

        // 点击进入课程
        console.log("打开第 " + (i + 1) + " 个课程");
        card.click();
        sleep(3000);

        console.log("开始学习...");
        play_video()

        // 返回列表
        // back();
        sleep(2500);

        // 重新获取控件列表，防止页面刷新导致控件失效
        targetList = textMatches(/.*(未学习|播放至).*/).find();
    }

    console.log("全部课程处理完成！");
}

/**
 * @description: 遍历课程
 * @param: null
 * @return: null
 */
function auto_study() {
    console.log("开启静音");
    // 要查找的课程ID
    const courseId = "com.huayi.cme:id/ll_mylike_course";
    // 1. 找到所有课程
    let courses = id(courseId).find();
    if (courses.length === 0) {
        console.log("未找到任何课程");
        exit();
    }
    console.log("找到 " + courses.length + " 个课程");

    // 2. 依次遍历每个课程
    for (let i = 0; i < courses.length; i++) {
        console.log("正在打开第 " + (i + 1) + " 个课程");

        // 点击当前课程
        courses[i].click();
        sleep(2000); // 等待页面加载

        // 3. 检查是否存在【未学习】或【播放至】字样
        let hasUnstudy = textContains("未学习").exists() || descContains("未学习").exists();
        let hasPlaying = textContains("播放至").exists() || descContains("播放至").exists();

        if (hasUnstudy || hasPlaying) {
            console.log("✅ 该课程未学习/未完成，不返回");
            study_card()
        } else {
            console.log("✅ 该课程已学习完毕，返回");
            back(); // 返回列表
            sleep(1000);
        }

        // 重新加载课程列表（避免返回后控件失效）
        courses = id(courseId).find();
    }

    console.log("✅ 所有课程检查完成");
}


// ============================== 其他函数 ==============================
function main() {
    auto.waitFor(); //等待获取无障碍辅助权限
    ScreenCapture()//截图权限请求
    console.show();
    var yinLiang = device.getMusicVolume();
    console.log("开启静音");
    device.setMusicVolume(0);
    var start = new Date().getTime(); //程序开始时间 
    start_app()
    auto_study()
    var end = new Date().getTime();
    console.log("运行结束,共耗时" + (parseInt(end - start)) / 1000 + "秒");
    console.log("恢复原来音量:" + yinLiang);
    device.setMusicVolume(yinLiang);
    threads.shutDownAll();
    console.hide();
    engines.stopAll();
    exit();
}

/**
 * @description: 导航到收藏页面，开屏广告暂未解决
 * @param: null
 * @return: null
 */
function start_app() {
    console.log("启动学习强国");
    if (!launchApp("掌上华医")) { //启动学习强国app
        console.error("找不到掌上华医!");
        return;
    }
    //关闭开屏广告
    // id("iv_close").waitFor();
    // id("iv_close").findOne().click();

    // iv_home_sys通过扫一扫判断是否回到主页，如果5次都没找到 → 退出
    for (let i = 0; i < 5; i++) {
        if (id("iv_home_sys").exists()) {
            console.log("发现主页");
            break; // 找到了就退出循环
        }

        back();
        sleep(1000);
        console.log("第" + (i + 1) + "次尝试");
    }
    if (!id("iv_home_sys").exists()) {
        console.error("5次未找到主页，请彻底关闭掌上华医后再重试");
        sleep(3000);
        threads.shutDownAll();
        console.hide();
        engines.stopAll();
        exit();
    }

    //一直导航到收藏页面
    if (className("android.widget.TextView").text("我的").exists()) {
        console.log("找到我的");
        className("android.widget.TextView").text("我的").findOne().parent().parent().click();
    } else {
        console.log("没找到我的");
    }

    if (className("android.widget.TextView").text("我的收藏").exists()) {
        console.log("我的收藏");
        className("android.widget.TextView").text("我的收藏").findOne().parent().click();
    } else {
        console.log("没找到我的收藏");
    }
    sleep(1000);
}


function ScreenCapture() {
    setScreenMetrics(1080, 1920);
    threads.shutDownAll();
    threads.start(function () {
        if (device.sdkInt >= 28) {
            threads.start(function () {
                packageName("com.android.systemui").text("立即开始").waitFor();
                text("立即开始").click();
            });
        }

        if (!requestScreenCapture()) {
            log("截图权限请求失败");
            exit();
        }
        log("截图权限已获取");
    });
    sleep(2000); // 等待授权完成
}
