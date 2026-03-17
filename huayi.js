/**
 * @Description: AutoX.js 华医网自动学习考试脚本（优化整理版）
 * @version: 1.2.1
 * @Author: UnaAtadura (优化整理)
 * @Date: 2026.03.17
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
// 工具函数
// ==============================================

/**
 * 时间字符串转秒数 (HH:MM:SS)
 */
function timeToSeconds(timeStr) {
    if (!timeStr || timeStr.indexOf(":") === -1) return 0;
    let parts = timeStr.split(":").map(Number);
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

/**
 * 获取下一个默认选项字母 (A->B->C->D->E->A)
 */
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
// 题库相关函数
// ==============================================

function 读取题库() {
    try {
        if (files.exists(题库文件路径)) {
            return JSON.parse(files.read(题库文件路径));
        }
    } catch (e) {
        // 忽略错误
    }
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

/**
 * 点击指定字母的选项
 */
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
    log(`⚠️ 未找到字母为 ${字母} 的选项`);
    return false;
}

/**
 * 清洗题目文本：去除题号、选项字母等，只保留纯题干
 */
function 清洗题目(str) {
    // 去掉末尾的 【您的答案:xxx】 部分
    str = str.split("【")[0].trim();
    // 去掉开头前缀：单选1、 多选2、 3. 等
    str = str.replace(/^(单选|多选|判断)?\s*\d+[、.\s]+/i, "").trim();
    return str;
}

/**
 * 从结果字符串中提取用户答案字母
 */
function 提取答案字母(str) {
    let m = str.match(/【您的答案：([A-E])/);
    return m ? m[1] : null;
}

/**
 * 识别结果页的图标颜色，更新题库
 */
function 识别对错并更新题库() {
    sleep(1000);
    let screen = captureScreen();
    let resultIcons = id("iv_item_test_result_weitongguo").find();

    if (resultIcons.length === 0) {
        log("未找到结果图标");
        screen.recycle();
        return;
    }

    for (let i = 0; i < resultIcons.length; i++) {
        let icon = resultIcons[i];
        let bounds = icon.bounds();
        let hasGreen = false;
        let hasRed = false;

        // 遍历图标区域像素，判断主色调
        for (let x = bounds.left; x < bounds.right; x++) {
            for (let y = bounds.top; y < bounds.bottom; y++) {
                let color = images.pixel(screen, x, y);
                let r = colors.red(color);
                let g = colors.green(color);
                let b = colors.blue(color);

                if (g > r + 40 && g > b + 40) {
                    hasGreen = true;
                    x = 9999;
                    y = 9999;
                    break;
                }
                if (r > g + 40 && r > b + 40) {
                    hasRed = true;
                    x = 9999;
                    y = 9999;
                    break;
                }
            }
        }

        let 题目区域 = icon.parent().findOne(id("tv_item_title"));
        if (!题目区域) continue;
        let 完整题目 = 题目区域.text().trim();
        let 正确选项 = 提取答案字母(完整题目);

        if (hasGreen && 正确选项) {
            let 纯题干 = 清洗题目(完整题目);
            题库[纯题干] = 正确选项;
            log(`📚 记录新题：${纯题干} -> ${正确选项}`);
        }
    }

    保存题库();
    screen.recycle();
    log("✅ 题库更新完成");
}

// ==============================================
// 考试相关函数
// ==============================================

function 开始做题() {
    while (true) {
        sleep(300);
        let 题目控件 = id("com.huayi.cme:id/tv_quest_single_title").findOne(2500);
        if (!题目控件) {
            log("未找到题目，结束本轮");
            break;
        }

        let 当前题目Raw = 题目控件.text().trim();
        log("原始题目：" + 当前题目Raw);

        let 当前题目 = 清洗题目(当前题目Raw);
        log("清洗后题干：" + 当前题目);

        if (当前题目 === 上一题文字) {
            log("题目无变化 → 交卷");
            let 交卷按钮 = id("com.huayi.cme:id/tv_answer_question_jiaojuan").findOne(2000);
            if (交卷按钮) {
                交卷按钮.click();
                sleep(2000);
            }
            break;
        }
        上一题文字 = 当前题目;

        let 正确选项 = 获取正确选项(当前题目);
        if (正确选项) {
            log("题库存在 → 选：" + 正确选项);
            点击选项(正确选项);
        } else {
            log("题库无题 → 选：" + 当前选项字母);
            点击选项(当前选项字母);
        }

        sleep(800);
        let 下一题按钮 = id("com.huayi.cme:id/btn_nextquestions").findOne(3000);
        if (下一题按钮) 下一题按钮.click();
    }
}

function do_test() {
    考试次数 = 0;
    while (考试次数 < 最大考试次数) {
        考试次数++;
        log("开始第 " + 考试次数 + " 次考试");
        开始做题();

        sleep(2000);
        let 未通过 = textContains("考试未通过").findOne(5000);

        if (!未通过) {
            log("✅ 第" + 考试次数 + "次考试通过！");
            let 完成按钮 = id("com.huayi.cme:id/btn_test_result_left").findOne(3000);
            if (完成按钮) 完成按钮.click();
            break;
        }

        if (考试次数 >= 最大考试次数) {
            log("已达到最大考试次数(" + 最大考试次数 + "次)，停止");
            return; // 改为 return 而不是 exit，避免强行终止整个脚本
        }

        log("❌ 未通过，收集正确答案...");
        识别对错并更新题库();

        log("🔄 准备重考");
        let 重考按钮 = id("com.huayi.cme:id/btn_test_result_right").findOne(3000);
        if (重考按钮) {
            重考按钮.click();
            sleep(3500);
        }

        当前选项字母 = 下一个字母(当前选项字母);
        log("下次默认选：" + 当前选项字母);
        上一题文字 = "";
    }
}

/**
 * @description: 遍历考试章节
 */
function test_card() {
    let targetList = textMatches(/.*待考试.*/).find();
    if (targetList.length === 0) {
        log("没有需要考试的课程");
        return;
    }

    log("找到 " + targetList.length + " 个考试");
    sleep(1500);

    for (let i = 0; i < targetList.length; i++) {
        let view = targetList[i];
        let card = null;
        let temp = view;

        for (let k = 0; k < 8; k++) {
            if (!temp) break;
            if (temp.id() === "com.huayi.cme:id/rl_item_course_detail") {
                card = temp;
                break;
            }
            temp = temp.parent();
        }

        if (!card) {
            log("第" + (i + 1) + "个：找不到考试卡片，跳过");
            continue;
        }

        log("打开第 " + (i + 1) + " 个考试");
        card.click();
        sleep(2000);
        if (id("rl_video_kaoshi").exists()) {
            id("rl_video_kaoshi").click();
        }
        log("开始考试...");
        do_test();

        // 返回列表
        back();
        sleep(2500);

        // 重新获取控件列表
        targetList = textMatches(/.*待考试.*/).find();
    }

    log("全部考试处理完成！");
}

/**
 * @description: 遍历考试课程
 */
function auto_test() {
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

        let hasTest = textContains("待考试").exists() || descContains("待考试").exists();

        if (hasTest) {
            log("✅ 该课程未考试，不返回");
            test_card(); // 进入课程内部的考试处理
        } else {
            log("✅ 该课程已考试完毕，返回");
            back();
            sleep(1000);
        }

        courses = id(courseId).find();
    }

    log("✅ 所有课程检查完成");
}

// ==============================================
// 视频学习相关函数
// ==============================================

/**
 * 显示进度条：点击视频区域
 */
function showTimeText() {
    try {
        let node = id("com.huayi.cme:id/rl_play").findOne(200);
        if (node) {
            let bounds = node.bounds();
            let x = (bounds.left + bounds.right) * 9 / 10;
            let y = (bounds.top + bounds.bottom) / 2;
            click(x, y);
            log("通过控件坐标点击成功，弹出进度条");
        }
        sleep(1000);
    } catch (e) {
        log("❌ 点击失败：" + e);
        sleep(300);
        click(device.width * 7 / 10, device.height / 5);
    }
}

/**
 * 循环检查并处理课堂思考
 */
function handleClassThinking() {
    if (!textContains("课堂思考").exists()) {
        log("✅ 无课堂思考");
        return;
    }

    log("🔍 发现课堂思考，开始自动答题...");
    const QUESTION_ITEM_ID = "com.huayi.cme:id/rl_cheack_item_quest_single_top";
    const SUBMIT_BTN_ID = "com.huayi.cme:id/btn_middle_question_comit";
    const MAX_TRY = 5;
    let tryCount = 0;

    while (textContains("课堂思考").exists() && tryCount < MAX_TRY) {
        tryCount++;
        log(`\n===== 第 ${tryCount} 次尝试 =====`);

        let options = id(QUESTION_ITEM_ID).find();
        if (options.length < 2) {
            log("⚠️ 选项不足2个，无法切换，退出");
            return;
        }

        // 奇数次选第1个，偶数次选第2个
        let selectIndex = tryCount % 2 === 1 ? 0 : 1;
        options[selectIndex].click();
        log(`📝 已选择第 ${selectIndex + 1} 个选项`);
        sleep(300);

        id(SUBMIT_BTN_ID).click();
        log("✅ 已提交答案");
        sleep(1000);

        if (!textContains("课堂思考").exists()) {
            log(`🎉 答题成功！共尝试 ${tryCount} 次`);
            let confirm = id("com.huayi.cme:id/btnAlertDialogConfirm").findOne(3000);
            if (confirm) confirm.click();
            return;
        }

        log(`❌ 答案错误，继续尝试...`);
    }

    log("⚠️ 已达到最大尝试次数（5次），停止答题");
}

/**
 * 播放视频并监控完成状态
 */
function play_video() {
    const MAX_WAIT_SECONDS = 4000;
    let startTime = new Date().getTime();
    let lastPercent = 0;

    while (true) {
        try {
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
            showTimeText();

            // 检测完成文字
            if (text("本课件已学习完毕").exists()) {
                log("✅ 检测到：本课件已学习完毕");
                id("com.huayi.cme:id/btn_test_result_left").click();
                log("✅ 返回上一页");
                break;
            }
            if (text("请点击左下角“考试”按钮参加课后测试").exists()) {
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
                sleep(2000);
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
                sleep(10000);
                if (text("本课件已学习完毕").exists()) {
                    id("com.huayi.cme:id/btn_test_result_left").click();
                } else {
                    back();
                }
                break;
            }

            lastPercent = percent;

        } catch (e) {
            log("⚠️ 异常，继续运行：" + e);
        }
        sleep(10000);
    }
}

/**
 * @description: 遍历学习章节
 */
function study_card() {
    let targetList = textMatches(/.*(未学习|播放至).*/).find();
    if (targetList.length === 0) {
        log("没有需要学习的课程");
        return;
    }

    log("找到 " + targetList.length + " 个未完成课程");
    sleep(1500);

    for (let i = 0; i < targetList.length; i++) {
        let view = targetList[i];
        let card = null;
        let temp = view;

        for (let k = 0; k < 8; k++) {
            if (!temp) break;
            if (temp.id() === "com.huayi.cme:id/rl_item_course_detail") {
                card = temp;
                break;
            }
            temp = temp.parent();
        }

        if (!card) {
            log("第" + (i + 1) + "个：找不到课程卡片，跳过");
            continue;
        }

        log("打开第 " + (i + 1) + " 个课程");
        card.click();
        sleep(3000);

        log("开始学习...");
        play_video();

        // 返回列表
        back();
        sleep(2500);

        targetList = textMatches(/.*(未学习|播放至).*/).find();
    }

    log("全部课程处理完成！");
}

/**
 * @description: 遍历学习课程
 */
function auto_study() {
    log("开启静音");
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

        let hasUnstudy = textContains("未学习").exists() || descContains("未学习").exists();
        let hasPlaying = textContains("播放至").exists() || descContains("播放至").exists();

        if (hasUnstudy || hasPlaying) {
            log("✅ 该课程未学习/未完成，不返回");
            study_card();
        } else {
            log("✅ 该课程已学习完毕，返回");
            back();
            sleep(1000);
        }

        courses = id(courseId).find();
    }

    log("✅ 所有课程检查完成");
}

// ==============================================
// 导航与权限
// ==============================================

function ScreenCapture() {
    // 设置屏幕分辨率
    setScreenMetrics(1080, 1920);
    
    // 请求截图权限（弹出系统授权框，用户手动点）
    if (!requestScreenCapture()) {
        log("用户拒绝了截图权限，脚本退出");
        exit(); // 不同意就直接退出
    }
    
    // 用户同意了，才会走到这里
    log("截图权限获取成功，脚本继续执行");
    sleep(1000);
}

function start_app() {
    log("启动掌上华医");
    if (!launchApp("掌上华医")) {
        log("找不到掌上华医!");
        return false;
    }

    // 等待主页出现
    for (let i = 0; i < 5; i++) {
        if (id("iv_home_sys").exists()) {
            log("发现主页");
            break;
        }
        back();
        sleep(1000);
        log("第" + (i + 1) + "次尝试");
    }
    if (!id("iv_home_sys").exists()) {
        log("5次未找到主页，请彻底关闭掌上华医后再重试");
        return false;
    }

    // 导航到收藏页面
    if (className("android.widget.TextView").text("我的").exists()) {
        log("找到我的");
        className("android.widget.TextView").text("我的").findOne().parent().parent().click();
    } else {
        log("没找到我的");
    }

    if (className("android.widget.TextView").text("我的收藏").exists()) {
        log("我的收藏");
        className("android.widget.TextView").text("我的收藏").findOne().parent().click();
    } else {
        log("没找到我的收藏");
    }
    sleep(1000);
    return true;
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

main();