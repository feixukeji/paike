import json
import pandas as pd
import re

output_file = 'data.js'

unitTimeRange = {
    1: (7*60+50, 8*60+35),
    2: (8*60+40, 9*60+25),
    3: (9*60+45, 10*60+30),
    4: (10*60+35, 11*60+20),
    5: (11*60+25, 12*60+10),
    6: (14*60+0, 14*60+45),
    7: (14*60+50, 15*60+35),
    8: (15*60+55, 16*60+40),
    9: (16*60+45, 17*60+30),
    10: (17*60+35, 18*60+20),
    11: (19*60+30, 20*60+15),
    12: (20*60+20, 21*60+5),
    13: (21*60+10, 21*60+55),
}

df = pd.read_excel("class.xlsx")

def dealTime(info: str):
    result = 0
    place = None
    plwt = {}
    if info == "":
        return (0, "")
    info = re.sub(r'_x000d_', '\n', info)
    info = re.split(r'[\x00-\x20]', info)
    for x in info:
        x = str(x)
        if x == "":
            continue
        if x[-1] == ':':
            place = x
        if x[-1] != ')':
            continue
        if not place in plwt:
            plwt[place] = [0, 0, 0, 0, 0, 0, 0]
        day = int(x[0]) - 1
        x = x[2:-1]
        if '~' in x:
            units = []
            st0, ed0 = map(lambda x: int(x[:2]) * 60 + int(x[3:]), x.split('~'))
            for unit in unitTimeRange:
                st1, ed1 = unitTimeRange[unit]
                if max(st0, st1) < min(ed0, ed1):
                    units.append(unit)
        else:
            units = list(map(int, x.split(',')))
        for i in units:
            plwt[place][day] |= 1 << i
        if 1 in units or 2 in units:
            result |= 1 << (day * 6 + 0)
        if 3 in units or 4 in units or 5 in units:
            result |= 1 << (day * 6 + 1)
        if 6 in units or 7 in units:
            result |= 1 << (day * 6 + 2)
        if 8 in units:
            result |= 1 << (day * 6 + 3)
        if 9 in units or 10 in units:
            result |= 1 << (day * 6 + 4)
        if 11 in units or 12 in units or 13 in units:
            result |= 1 << (day * 6 + 5)
    st = ""
    for k, v in plwt.items():
        for i in range(1, 8):
            r = v[i - 1]
            if r:
                u = ""
                for j in range(1, 14):
                    if (r >> j) & 1:
                        u = u + str(j) + ','
                st = st + k + str(i) + '(' + u[:-1] + ');'
        if not v:
            st = st + k + ";"
    return (result, st[:-1])

def dealWeek(info):
    result = 0
    for period in info.split('\n'):
        if '周 ' not in period:
            continue
        period = period.split('周 ')[0]
        for x in period.split(','):
            if '~' not in x and str(int(x)) == x:
                result |= 1 << int(x)
                continue
            special = ''
            if x.endswith('(单)'):
                special = 'Odd'
                x = x[:-3]
            if x.endswith('(双)'):
                special = 'Even'
                x = x[:-3]
            t = x.split('~')
            assert len(t) == 2, t
            if special == 'Odd':
                for week in range(int(t[0]), int(t[1]) + 1):
                    if week % 2 == 1:
                        result |= 1 << week
            elif special == 'Even':
                for week in range(int(t[0]), int(t[1]) + 1):
                    if week % 2 == 0:
                        result |= 1 << week
            else:
                for week in range(int(t[0]), int(t[1]) + 1):
                    result |= 1 << week
    result >>= 1
    return result

output = []
for i in df.index:
    tm = df['时间地点'][i]
    if type(tm) == float:
        tm = ""
    time, plwt = dealTime(tm)
    teachers = df["授课教师"][i]
    if type(teachers) == float:
        teachers = []
    else:
        teachers = teachers.split(',')
    teacher = teachers
    if len(teacher) >= 3:
        teacher = teacher[:2] + ['...']
    teacher = ','.join(teacher)
    week = dealWeek(tm)
    if week == 0 and time != 0:
        week = (1 << 18) - 1
    sim_course = {
        'code': df['课堂号'][i],
        'courseName': df['课程名'][i],
        'teacher': teacher,
        'teachers': teachers,
        'weekType': week,
        'timeType0': time & ((1 << 30) - 1),
        'placeDayTime': plwt,
        'credit': df['学分'][i],
        'volume': f"{df['选课人数'][i]}/{df['限选人数'][i]}"
    }
    if time >> 30:
        sim_course['timeType1'] = time >> 30
    if type(df['课堂类型'][i]) == str and df['课堂类型'][i].find('通识') != -1:
        sim_course['tongshi'] = 1
    for key in sim_course:
        if sim_course[key] is None:
            print(sim_course)
    output.append(sim_course)


##### 处理评课社区评分 #####
from icourse_spider import lesson_match
for lesson in output:
    icourseRating = lesson_match.get_icourseRating(lesson['courseName'], lesson['teachers'])
    if icourseRating != '暂无评分':
        lesson['icourseRating'] = icourseRating
    lesson.pop('teachers')
##### 完成评分处理 #####

output.sort(key=lambda x: x['code'])
final_data = json.dumps(output, ensure_ascii=False, separators=(',', ':'))
final_data = final_data.replace('"code"', 'code')
final_data = final_data.replace('"courseName"', 'courseName')
final_data = final_data.replace('"teacher"', 'teacher')
final_data = final_data.replace('"weekType"', 'weekType')
final_data = final_data.replace('"timeType0"', 'timeType0')
final_data = final_data.replace('"timeType1"', 'timeType1')
final_data = final_data.replace('"tongshi"', 'tongshi')
final_data = final_data.replace('"placeDayTime"', 'placeDayTime')
final_data = final_data.replace('"icourseRating"', 'icourseRating')
final_data = final_data.replace('"credit"', 'credit')
with open(output_file, 'w', encoding='utf-8') as f:
    f.write('var version="260622";var semester="2026年秋季学期";var allLesson=' + final_data + ';')