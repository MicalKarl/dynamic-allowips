

const chinaTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
});


function toChinaTimeString(date) {
    return chinaTimeFormatter.format(date);
}

module.exports = {toChinaTimeString};
