/**
 * @Description: 掌上华医 - 全自动刷课 + 智能考试(自动建题库/自动重考/最多5次)
 * @Version: 1.1.0 优化整理版
 * @Author: UnaAtadura
 * @Date: 2026.03.16
 */

// ==============================================
// 全局配置（稳定版）
// ==============================================
auto();
const 题库文件路径 = files.path("./考试题库.json");
var 题库 = 读取题库();
var 上一题文字 = "";
var 当前选项字母 = "A";
var 考试次数 = 0;
const 最大考试次数 = 5;

// ==============================================
// 主入口（一键启动）
// ==============================================
function main() {
    ScreenCapture();
    console.show();
    let 原音量 = device.getMusicVolume();
    device.setMusicVolume(0);
    log("已静音");

    let 开始时间 = new Date().getTime();
    start_app();
    auto_study();
    auto_test();

    let 结束时间 = new Date().getTime();
    log("运行完成，耗时：" + parseInt((结束时间 - 开始时间) / 1000) + "秒");
    device.setMusicVolume(原音量);
    log("恢复音量");
    toast("全部任务完成！");
    engines.stopAll();
}

// ==============================================
// 1. 智能考试系统（核心）
// ==============================================
function auto_test() {
    let 课程列表 = id("com.huayi.cme:id/ll_mylike_course").find();
    if (课程列表.length === 0) return log("未找到课程");

    for (let i = 0; i < 课程列表.length; i++) {
        log("打开第" + (i + 1) + "个课程");
        课程列表[i].click();
        sleep(2000);

        if (textContains("待考试").exists()) {
            log("检测到待考试 → 开始考试");
            do_test();
        } else {
            log("已完成 → 返回");
            back();
            sleep(1000);
        }
        课程列表 = id("com.huayi.cme:id/ll_mylike_course").find();
    }
    log("✅ 所有课程处理完毕");
}

// 循环考试（最多5次）
function do_test() {
    考试次数 = 0;
    当前选项字母 = "A";
    上一题文字 = "";

    while (考试次数 < 最大考试次数) {
        考试次数++;
        log("========= 第" + 考试次数 + "次考试 =========");
        开始做题();

        sleep(2000);
        let 未通过 = textContains("考试未通过").findOnce();

        if (!未通过) {
            log("✅ 考试通过！");
            id("com.huayi.cme:id/btn_test_result_left").click();
            return;
        }

        if (考试次数 >= 最大考试次数) {
            log("已达最大考试次数，停止");
            exit();
        }

        log("❌ 未通过 → 收集正确答案");
        识别对错并更新题库();

        log("🔄 重新考试");
        id("com.huayi.cme:id/btn_test_result_right").click();
        sleep(3500);
        当前选项字母 = 下一个字母(当前选项字母);
        上一题文字 = "";
    }
}

// 自动答题
function 开始做题() {
    while (true) {
        sleep(300);
        let 题目控件 = id("com.huayi.cme:id/tv_quest_single_title").findOnce(2500);
        if (!题目控件) break;

        let 原始题目 = 题目控件.text().trim();
        let 纯题目 = 清洗题目(原始题目);

        if (纯题目 === 上一题文字) {
            log("题目无变化 → 交卷");
            id("com.huayi.cme:id/tv_answer_question_jiaojuan").click();
            sleep(2000);
            break;
        }
        上一题文字 = 纯题目;

        let 答案 = 获取正确选项(纯题目);
        if (答案) {
            log("✅ 题库已存在 → 选：" + 答案);
            点击选项(答案);
        } else {
            log("📝 题库不存在 → 本轮选：" + 当前选项字母);
            点击选项(当前选项字母);
        }

        sleep(800);
        id("com.huayi.cme:id/btn_nextquestions").click();
    }
}

// 题目清洗（完美去除前缀：单选1、2、3. 等）
function 清洗题目(str) {
    str = str.split("【")[0].trim();
    str = str.replace(/^(单选|多选|判断)?\s*\d+[、.\s]+/i, "").trim();
    return str;
}

// 点击选项
function 点击选项(字母) {
    let 选项列表 = id("com.huayi.cme:id/rl_cheack_item_quest_single_top").find();
    for (let 选项 of 选项列表) {
        let 文字 = 选项.findOne(id("com.huayi.cme:id/tv_item_quest_single_zimu"));
        if (文字 && 文字.text().startsWith(字母)) {
            选项.click();
            sleep(200);
            return;
        }
    }
}

// 识别对错并写入题库
function 识别对错并更新题库() {
    sleep(1000);
    let 截图 = captureScreen();
    let 结果图标 = id("iv_item_test_result_weitongguo").find();

    for (let 图标 of 结果图标) {
        let 区域 = 图标.bounds();
        let 正确 = false, 错误 = false;

        for (let x = 区域.left; x < 区域.right; x++) {
            for (let y = 区域.top; y < 区域.bottom; y++) {
                let c = images.pixel(截图, x, y);
                let r = red(c), g = green(c), b = blue(c);
                if (g > r + 40 && g > b + 40) { 正确 = true; x = 9999; break; }
                if (r > g + 40 && r > b + 40) { 错误 = true; x = 9999; break; }
            }
        }

        let 题目区域 = 图标.parent().findOne(id("tv_item_title"));
        if (!题目区域) continue;

        let 完整题目 = 题目区域.text().trim();
        let 答案 = 提取答案字母(完整题目);
        let 纯题干 = 清洗题目(完整题目);

        if (正确 && 答案) {
            题库[纯题干] = 答案;
            log("记录：" + 纯题干 + " → " + 答案);
        }
    }
    保存题库();
    截图.recycle();
    log("✅ 题库更新完成");
}

// 提取答案 A/B/C/D/E
function 提取答案字母(str) {
    let m = str.match(/【您的答案：([A-E])/);
    return m ? m[1] : null;
}

// 下一个选项
function 下一个字母(c) {
    switch (c) {
        case "A": return "B";
        case "B": return "C";
        case "C": return "D";
        case "D": return "E";
        default: return "A";
    }
}

// 题库操作
function 读取题库() {
    try { return files.exists(题库文件路径) ? JSON.parse(files.read(题库文件路径)) : {};
    } catch (e) { return {}; }
}
function 保存题库() {
    try { files.write(题库文件路径, JSON.stringify(题库, null, 2)); } catch (e) {}
}
function 获取正确选项(题目) {
    return 题库[题目] || null;
}

// ==============================================
// 2. 自动刷视频（稳定无崩溃）
// ==============================================
function play_video() {
    const MAX_WAIT = 4000;
    let 开始时间 = new Date().getTime();
    let 上次进度 = 0;

    while (true) {
        handleClassThinking();
        if ((new Date().getTime() - 开始时间) / 1000 >= MAX_WAIT) {
            log("超时退出"); back(); break;
        }

        showTimeText();
        if (text("本课件已学习完毕").exists()) {
            id("btn_test_result_left").click(); break;
        }

        let 当前 = id("playDuration").text();
        let 总时长 = id("videoDuration").text();
        let 当前秒 = timeToSeconds(当前);
        let 总秒 = timeToSeconds(总时长);

        if (总秒 <= 0) { sleep(2000); continue; }
        let 进度 = 当前秒 / 总秒;
        log("进度：" + (进度 * 100).toFixed(1) + "%");

        if (上次进度 > 0 && 进度 < 上次进度) {
            log("播放完成"); back(); break;
        }
        if (进度 >= 0.999) {
            sleep(5000); back(); break;
        }
        上次进度 = 进度;
        sleep(10000);
    }
}

// 显示进度条
function showTimeText() {
    let 播放区域 = id("rl_play").findOnce();
    if (播放区域) {
        let b = 播放区域.bounds();
        click((b.left + b.right) * 0.9, (b.top + b.bottom) / 2);
    }
    sleep(1000);
}

// 时间转秒
function timeToSeconds(str) {
    if (!str || !str.includes(":")) return 0;
    let p = str.split(":").map(Number);
    return p[0] * 3600 + p[1] * 60 + (p[2] || 0);
}

// 课堂思考自动答题
function handleClassThinking() {
    if (!textContains("课堂思考").exists()) return;
    for (let i = 0; i < 5; i++) {
        let 选项 = id("rl_cheack_item_quest_single_top").find();
        选项[i % 选项.length].click();
        id("btn_middle_question_comit").click();
        sleep(1000);
        if (!textContains("课堂思考").exists()) {
            id("btnAlertDialogConfirm").click();
            return;
        }
    }
}

// ==============================================
// 3. 自动遍历课程
// ==============================================
function auto_study() {
    let 课程列表 = id("ll_mylike_course").find();
    for (let 课程 of 课程列表) {
        课程.click(); sleep(2000);
        if (textContains("未学习").exists() || textContains("播放至").exists()) {
            study_card();
        } else {
            back(); sleep(1000);
        }
        课程列表 = id("ll_mylike_course").find();
    }
}

function study_card() {
    let 列表 = textMatches(/(未学习|播放至)/).find();
    for (let 项 of 列表) {
        let 卡片 = findParent(项, "rl_item_course_detail");
        if (!卡片) continue;
        卡片.click(); sleep(3000);
        play_video();
        列表 = textMatches(/(未学习|播放至)/).find();
    }
}

// 安全查找父控件
function findParent(view, targetId) {
    for (let i = 0; i < 8; i++) {
        if (!view) break;
        if (view.id() == targetId) return view;
        view = view.parent();
    }
    return null;
}

// ==============================================
// 4. 启动APP + 自动导航
// ==============================================
function start_app() {
    if (!launchApp("掌上华医")) {
        log("未找到掌上华医"); exit();
    }
    sleep(3000);

    for (let i = 0; i < 5; i++) {
        if (id("iv_home_sys").exists()) break;
        back(); sleep(1000);
    }

    text("我的").findOnce().parent().parent().click();
    sleep(500);
    text("我的收藏").findOnce().parent().click();
    sleep(1000);
}

// ==============================================
// 5. 截图权限
// ==============================================
function ScreenCapture() {
    setScreenMetrics(1080, 1920);
    threads.start(function () {
        if (device.sdkInt >= 28) text("立即开始").click();
        if (!requestScreenCapture()) exit();
    });
    sleep(2500);
}

// ==============================================
// 启动
// ==============================================
main();