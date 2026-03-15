/**代码原作者
 * @Description: AutoX.js Ai-huayi 
 * @version: 1.0.1
 * @Author: UnaAtadura
 * @Date: 2026.03.15
 */

main()
// showTimeText()
// play_video() 
// handleClassThinking()









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
                toast("⏰ 等待超时，脚本结束");
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
                toast("✅ 返回上一页");
                break;
            }
            let finishText2 = text("请点击左下角“考试”按钮参加课后测试，通过后即为学完本课件。").findOne(1000);
            if (finishText2) {
                log("✅ 检测到：“考试”按钮");
                id("com.huayi.cme:id/btnAlertDialogConfirm").click();
                sleep(500)
                toast("✅ 返回上一页");                
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
                toast("✅ 视频已完成");
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
                    toast("✅ 返回上一页");
                } else {
                    back();
                    toast("✅ 返回上一页");
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
    // 要查找的课程ID（你提供的）
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

function main() {
    auto.waitFor(); //等待获取无障碍辅助权限
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





