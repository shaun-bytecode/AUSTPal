import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
import requests
from typing import Union
from langchain_core.tools import tool

from utils.logger_handler import logger


CAMPUSES = [
    {"zh": "淮南校区", "en": "Huainan"},
    {"zh": "合肥校区", "en": "Hefei"},
]

WEATHER_DESC_MAP = {
    "Sunny": "晴", "Clear": "晴", "Partly cloudy": "多云", "Cloudy": "阴",
    "Overcast": "阴天", "Mist": "薄雾", "Fog": "雾", "Drizzle": "毛毛雨",
    "Light drizzle": "小毛毛雨", "Freezing drizzle": "冻雨", "Heavy freezing drizzle": "大冻雨",
    "Light rain": "小雨", "Moderate rain": "中雨", "Heavy rain": "大雨",
    "Light rain, mist": "小雨伴薄雾", "Moderate rain, mist": "中雨伴薄雾",
    "Light freezing rain": "小冻雨", "Moderate or heavy freezing rain": "中大冻雨",
    "Light rain shower": "阵小雨", "Moderate or heavy rain shower": "阵中大雨",
    "Torrential rain shower": "暴雨", "Light sleet": "小雨夹雪", "Moderate or heavy sleet": "中大雨夹雪",
    "Patchy rain possible": "局部有雨", "Patchy rain nearby": "附近有雨",
    "Patchy snow possible": "局部有雪", "Patchy snow nearby": "附近有雪",
    "Light snow": "小雪", "Moderate snow": "中雪", "Heavy snow": "大雪",
    "Blowing snow": "风雪", "Blizzard": "暴风雪", "Ice pellets": "冰粒",
    "Thundery outbreaks possible": "雷阵雨",
    "Patchy light rain with thunder": "局部雷阵雨", "Moderate or heavy rain with thunder": "雷暴大雨",
    "Patchy light snow with thunder": "局部雷雪", "Moderate or heavy snow with thunder": "雷暴雪",
}

WIND_DIR_MAP = {
    "N": "北风", "NNE": "北东北风", "NE": "东北风", "ENE": "东东北风",
    "E": "东风", "ESE": "东东南风", "SE": "东南风", "SSE": "南东南风",
    "S": "南风", "SSW": "南西南风", "SW": "西南风", "WSW": "西西南风",
    "W": "西风", "WNW": "西西北风", "NW": "西北风", "NNW": "北西北风",
}


def _fetch_city_weather(en_city: str) -> Union[dict, str]:
    url = f"https://wttr.in/{en_city}?format=j1"
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        result = resp.json()
        # 兼容 wttr.in 将数据包在 "data" 键下的新格式
        return result.get("data", result)
    except Exception as e:
        logger.error(f"[天气查询] {en_city} 请求失败: {e}", exc_info=True)
        return str(e)


def _format_campus(campus_zh: str, data: Union[dict, str]) -> str:
    if isinstance(data, str):
        return f"【{campus_zh}】天气查询失败：{data}"

    conditions = data.get("current_condition")
    if not conditions:
        logger.error(f"[天气解析] {campus_zh} 响应缺少 current_condition，实际 keys: {list(data.keys())}")
        return f"【{campus_zh}】天气数据解析失败：API 返回结构异常"
    current = conditions[0]
    raw_desc = current.get("weatherDesc", [{}])[0].get("value", "")
    desc = WEATHER_DESC_MAP.get(raw_desc, raw_desc) or "未知"
    temp_c      = current.get("temp_C", "N/A")
    feels_like  = current.get("FeelsLikeC", "N/A")
    humidity    = current.get("humidity", "N/A")
    wind_speed  = current.get("windspeedKmph", "N/A")
    wind_dir_raw = current.get("winddir16Point", "")
    wind_dir    = WIND_DIR_MAP.get(wind_dir_raw, wind_dir_raw) or "未知"
    visibility  = current.get("visibility", "N/A")
    uv_index    = current.get("uvIndex", "N/A")

    lines = [
        f"【{campus_zh}当前天气】",
        f"  天气：{desc}",
        f"  气温：{temp_c}°C（体感 {feels_like}°C）",
        f"  湿度：{humidity}%",
        f"  风向风速：{wind_dir} {wind_speed} km/h",
        f"  能见度：{visibility} km",
        f"  紫外线指数：{uv_index}",
        "",
        "  近三天预报：",
    ]

    for day in data.get("weather", []):
        date  = day.get("date", "N/A")
        max_t = day.get("maxtempC", "N/A")
        min_t = day.get("mintempC", "N/A")
        hourly = day.get("hourly", [])
        raw_day_desc = hourly[4].get("weatherDesc", [{}])[0].get("value", "") if len(hourly) > 4 else ""
        day_desc = WEATHER_DESC_MAP.get(raw_day_desc, raw_day_desc) or "未知"
        if hourly:
            avg_humidity = round(sum(int(h.get("humidity", 0)) for h in hourly) / len(hourly))
            humidity_str = f"，平均湿度 {avg_humidity}%"
        else:
            humidity_str = ""
        lines.append(f"  {date}：{day_desc}，{min_t}°C ~ {max_t}°C{humidity_str}")

    return "\n".join(lines)



@tool(description="获取安徽理工大学淮南校区和合肥校区当前及未来三天天气数据，供主模型生成生活建议")
def get_weather(query: str) -> str:
    """同时查询淮南校区和合肥校区的当前天气及未来三天预报，返回原始天气数据。

    参数:
        query: 用户的原始提问
    """
    from concurrent.futures import ThreadPoolExecutor

    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = {
            campus["zh"]: executor.submit(_fetch_city_weather, campus["en"])
            for campus in CAMPUSES
        }
        results = {zh: future.result() for zh, future in futures.items()}

    sections = [_format_campus(zh, results[zh]) for zh in [c["zh"] for c in CAMPUSES]]
    return "\n\n".join(sections)


if __name__ == "__main__":
    import sys

    query = sys.argv[1] if len(sys.argv) > 1 else "今天天气怎么样？"
    print(get_weather(query))