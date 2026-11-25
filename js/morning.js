/* Вкладка «Утро»: истории дня (погода, слово, поговорка), сводка «После подъёма» листаемыми карточками,
   открытки утра с пейзажами, подарки за серию (новые пейзажи для открыток) и группа подъёма с друзьями. */
(() => {
  'use strict';
  const { ic, esc, pad, TASKS, appKit: K } = Sonly;
  /* Для текста не на экране (картинка открытки, «Поделиться»): язык интерфейса. */
  const LOC = () => (Sonly.i18n ? Sonly.i18n.locale : 'ru-RU');
  const WD = (x) => (Sonly.i18n ? Sonly.i18n.word(x) : x);
  const T = (key, vars) => (Sonly.i18n ? Sonly.i18n.t(key, vars) : key.replace(/\{(\w+)\}/g, (m, k) => vars[k]));
  const si = (id, size) => Sonly.si(id, size);
  const app = Sonly.concepts.app;
  const doy = (d = new Date()) => Math.round((K.day0(d) - new Date(d.getFullYear(), 0, 0)) / 864e5);
  const today = () => K.day0(new Date()).getTime();
  const cap = (x) => x.replace(/^./, (c) => c.toUpperCase());
  /* Короткие слова держатся за следующее, последние два слова — вместе: ни висячих предлогов, ни одного слова в последней строке. */
  const nb = (t) => t.replace(/(^|[\s «])([а-яёa-z]{1,2}) /gi, '$1$2 ').replace(/ (\S+)$/, ' $1');

  /* Слова дня: слово, часть речи, толкование и пример. Меняются раз в сутки; повторяются примерно через два месяца. */
  const WORDS = [
    ['Заря', 'сущ., ж. р.', 'Яркое освещение горизонта перед восходом или после захода солнца.', 'Вышли в путь с первой зарёй.'],
    ['Спозаранку', 'наречие', 'Очень рано, ранним утром.', 'Спозаранку он уже был на ногах.'],
    ['Жаворонок', 'сущ., м. р.', 'Певчая птица. Так же зовут человека, который рано встаёт и рано ложится.', 'Я жаворонок: в шесть утра голова работает лучше всего.'],
    ['Утренник', 'сущ., м. р.', 'Лёгкий утренний мороз весной или осенью. А ещё детский праздник в первой половине дня.', 'Ночью ударил утренник, и лужи затянуло льдом.'],
    ['Побудка', 'сущ., ж. р.', 'Сигнал к подъёму ото сна — например, в армии.', 'Побудку сыграли ровно в шесть.'],
    ['Предрассветный', 'прилагательное', 'Бывающий перед самым рассветом.', 'Над рекой стоял предрассветный туман.'],
    ['Росистый', 'прилагательное', 'Покрытый росой.', 'Мы шли босиком по росистой траве.'],
    ['Зорька', 'сущ., ж. р.', 'Ласковое название зари.', 'Рыбаки ушли на утреннюю зорьку.'],
    ['Ни свет ни заря', 'выражение', 'Очень рано, когда ещё не рассвело.', 'Встал ни свет ни заря, чтобы успеть на поезд.'],
    ['Бодрствовать', 'глагол', 'Не спать, быть в сознании.', 'Дежурный бодрствовал всю ночь.'],
    ['Рассвет', 'сущ., м. р.', 'Время, когда восходит солнце и становится светло.', 'На рассвете птицы начинают петь.'],
    ['Восход', 'сущ., м. р.', 'Появление солнца над горизонтом.', 'Мы успели на вершину к восходу.'],
    ['Утренница', 'сущ., ж. р.', 'Утренняя звезда — планета Венера на рассветном небе.', 'Над лесом ещё горела утренница.'],
    ['Ранняя пташка', 'выражение', 'Человек, который привык вставать рано.', 'Бабушка — ранняя пташка: к семи она уже на рынке.'],
    ['Сонливость', 'сущ., ж. р.', 'Желание спать, вялость.', 'Стакан холодной воды прогнал сонливость.'],
    ['Дрёма', 'сущ., ж. р.', 'Лёгкий, неглубокий сон.', 'Сквозь дрёму он услышал будильник.'],
    ['Потягиваться', 'глагол', 'Вытягивать руки и всё тело, чтобы размяться после сна.', 'Кот долго потягивался на подоконнике.'],
    ['Бодрый', 'прилагательное', 'Полный сил, свежий и энергичный.', 'Он вышел к завтраку бодрым и весёлым.'],
    ['Взбодриться', 'глагол', 'Почувствовать прилив сил, стряхнуть сонливость.', 'Умылся холодной водой и сразу взбодрился.'],
    ['Свежесть', 'сущ., ж. р.', 'Прохлада и чистота воздуха. А ещё отдохнувшее состояние.', 'Утренняя свежесть пахла травой.'],
    ['Хронотип', 'сущ., м. р.', 'Тип суточного ритма человека: когда ему легче вставать и работать.', 'Узнай свой хронотип, прежде чем ставить будильник на пять.'],
    ['Циркадный', 'прилагательное', 'Связанный с суточным, примерно 24-часовым ритмом организма.', 'Яркий утренний свет настраивает циркадные ритмы.'],
    ['Мелатонин', 'сущ., м. р.', 'Гормон, который помогает засыпать. Вырабатывается в темноте.', 'Яркий экран перед сном мешает мелатонину.'],
    ['Кофеин', 'сущ., м. р.', 'Вещество в кофе и чае, которое бодрит.', 'Кофеин начинает действовать минут через двадцать.'],
    ['Зарядка', 'сущ., ж. р.', 'Короткая утренняя гимнастика.', 'Пять минут зарядки — и тело проснулось.'],
    ['Распорядок', 'сущ., м. р.', 'Заведённый порядок дел по времени.', 'Новый распорядок дня прижился за неделю.'],
    ['Привычка', 'сущ., ж. р.', 'Действие, которое со временем делается само, без усилий.', 'Ранний подъём наконец стал привычкой.'],
    ['Утречко', 'сущ., ср. р.', 'Ласковое название утра.', 'Доброе утречко, соня!'],
    ['Спросонья', 'наречие', 'В состоянии, когда ещё не совсем проснулся.', 'Спросонья он надел носки разного цвета.'],
    ['Засоня', 'сущ., общий род', 'Тот, кто любит поспать подольше.', 'Засоня опять проспал первую пару.'],
    ['Лежебока', 'сущ., общий род', 'Ленивый человек, который любит валяться.', 'Вставай, лежебока, солнце уже высоко!'],
    ['Будильник', 'сущ., м. р.', 'Часы со звонком, который будит в нужное время.', 'Будильник зазвонил ровно в семь.'],
    ['Пробуждение', 'сущ., ср. р.', 'Выход из сна, переход к бодрствованию.', 'Мягкое пробуждение настраивает на хороший день.'],
    ['Полусон', 'сущ., м. р.', 'Состояние между сном и бодрствованием.', 'В полусне он нащупал телефон.'],
    ['Предутренний', 'прилагательное', 'Бывающий перед самым утром.', 'В предутренний час город особенно тих.'],
    ['Заутреня', 'сущ., ж. р.', 'Ранняя утренняя церковная служба.', 'Колокола звали к заутрене.'],
    ['Чуть свет', 'выражение', 'Очень рано, едва начало светать.', 'Чуть свет мы уже были в дороге.'],
    ['С петухами', 'выражение', 'Очень рано — о том, когда встают или просыпаются.', 'В деревне все встают с петухами.'],
    ['Чем свет', 'выражение', 'Ранним утром, с рассветом.', 'Чем свет он отправился на рыбалку.'],
    ['Позавтракать', 'глагол', 'Поесть утром, съесть первую еду дня.', 'Мы позавтракали на веранде.'],
    ['Сырники', 'сущ., мн. ч.', 'Жареные лепёшки из творога — частый утренний завтрак.', 'По воскресеньям мама жарит сырники.'],
    ['Восходящий', 'прилагательное', 'Поднимающийся вверх. О солнце — встающий над горизонтом.', 'Восходящее солнце окрасило крыши.'],
    ['Лучистый', 'прилагательное', 'Излучающий свет, сияющий.', 'У неё добрые лучистые глаза.'],
    ['Безоблачный', 'прилагательное', 'Без облаков. В переносном смысле — спокойный, без забот.', 'Утро обещало безоблачный день.'],
    ['Иней', 'сущ., м. р.', 'Тонкий слой льда на траве и предметах после холодной ночи.', 'Утром трава побелела от инея.'],
    ['Изморозь', 'сущ., ж. р.', 'Ледяные кристаллы на ветках и проводах в морозный туман.', 'Деревья стояли в пушистой изморози.'],
    ['Щебет', 'сущ., м. р.', 'Быстрое звонкое пение птиц.', 'Под окном раздавался весёлый щебет.'],
    ['Энергичный', 'прилагательное', 'Деятельный, полный сил.', 'Энергичный ведущий разбудил весь зал.'],
    ['Продуктивный', 'прилагательное', 'Приносящий много результатов.', 'Самые продуктивные часы у меня утром.'],
    ['Ритуал', 'сущ., м. р.', 'Привычный порядок действий, который повторяется.', 'Мой утренний ритуал — вода, растяжка и кофе.'],
    ['Медитация', 'сущ., ж. р.', 'Упражнение на сосредоточение и спокойствие ума.', 'Пять минут медитации помогают собраться.'],
    ['Осознанность', 'сущ., ж. р.', 'Умение замечать, что делаешь и чувствуешь прямо сейчас.', 'Осознанность начинается с первого вдоха утром.'],
    ['Выспаться', 'глагол', 'Поспать столько, сколько нужно для отдыха.', 'Наконец-то я выспался!'],
    ['Недосып', 'сущ., м. р.', 'Нехватка сна.', 'От недосыпа трудно сосредоточиться.'],
    ['Подъём', 'сущ., м. р.', 'Пробуждение и вставание с постели.', 'Подъём в шесть больше не пугает.'],
    ['Встрепенуться', 'глагол', 'Резко оживиться, прийти в себя.', 'Услышав своё имя, он встрепенулся.'],
    ['Ободрить', 'глагол', 'Придать уверенности и сил.', 'Тёплые слова друга ободрили её.'],
    ['Солнцестояние', 'сущ., ср. р.', 'День, когда солнце в полдень выше или ниже всего за год.', 'В летнее солнцестояние самая короткая ночь.'],
    ['Сумерки', 'сущ., мн. ч.', 'Полутьма перед восходом или после заката.', 'В утренних сумерках дорога казалась длиннее.'],
    ['Алеть', 'глагол', 'Становиться алым, красноватым.', 'Восток начал алеть.'],
    ['Туманный', 'прилагательное', 'Покрытый туманом. В переносном смысле — неясный.', 'Туманное утро обещало тёплый день.'],
    ['Утренний', 'прилагательное', 'Относящийся к утру, бывающий утром.', 'Утренний кофе пахнет по-особенному.'],
  ];
  /* Поговорка и её смысл. */
  const SAYINGS = [
    ['Кто рано встаёт, тому Бог подаёт.', 'Кто раньше начинает день, тот больше успевает.'],
    ['Утро вечера мудренее.', 'Важное лучше решать на свежую голову.'],
    ['Утренний час дарит золотом нас.', 'Утреннее время — самое ценное.'],
    ['Встанешь пораньше — шагнёшь подальше.', 'Ранний подъём даёт фору на весь день.'],
    ['Кто поздно встаёт, у того хлеба недостаёт.', 'Кто просыпает утро, тот упускает возможности.'],
    ['Долго спать — с долгом встать.', 'Лишний сон оборачивается несделанными делами.'],
    ['Ранняя птичка носок прочищает, а поздняя глаза продирает.', 'Пока один просыпается, другой уже при деле.'],
    ['Кто рано встаёт, у того копейка ведётся.', 'Ранний подъём помогает и в делах, и в достатке.'],
    ['Кто рано встаёт, тот грибы себе берёт, а сонливый да ленивый идут после за крапивой.', 'Лучшее достаётся тому, кто начал раньше.'],
    ['Спать долго — жить с долгом.', 'Кто много спит, тот многое не успевает.'],
    ['Делу время, потехе час.', 'Сначала дело, развлечения — потом и понемногу.'],
    ['Сделал дело — гуляй смело.', 'Закончил работу — отдыхай со спокойной душой.'],
    ['Без труда не выловишь и рыбку из пруда.', 'Любой результат требует усилий.'],
    ['Терпение и труд всё перетрут.', 'Упорство помогает справиться с чем угодно.'],
    ['Капля камень точит.', 'Маленькие ежедневные усилия дают большой результат.'],
    ['Повторенье — мать ученья.', 'Чтобы закрепить привычку или знание, нужно повторять.'],
    ['Москва не сразу строилась.', 'Большое делается постепенно, шаг за шагом.'],
    ['Хорошее начало — половина дела.', 'Правильный старт облегчает всё остальное.'],
    ['Конец — делу венец.', 'Важно довести начатое до конца.'],
    ['Глаза боятся, а руки делают.', 'Страшно только начинать, дальше дело идёт.'],
    ['Под лежачий камень вода не течёт.', 'Без действий ничего не изменится.'],
    ['Не откладывай на завтра то, что можно сделать сегодня.', 'Сделанное сегодня не ляжет грузом на завтра.'],
    ['Лучше поздно, чем никогда.', 'Начать никогда не поздно.'],
    ['Тише едешь — дальше будешь.', 'Спокойный ровный темп надёжнее спешки.'],
    ['Поспешишь — людей насмешишь.', 'Торопливость приводит к ошибкам.'],
    ['Дорога ложка к обеду.', 'Всё ценно, когда приходится вовремя.'],
    ['Летний день год кормит.', 'Упущенное в нужное время потом не наверстать.'],
    ['Долог день до вечера, коли делать нечего.', 'Без дела время тянется бесконечно.'],
    ['День да ночь — сутки прочь.', 'Время летит незаметно, его стоит ценить.'],
    ['Время — деньги.', 'Потерянное время не вернёшь.'],
    ['Сон — лучшее лекарство.', 'Хороший сон восстанавливает силы лучше таблеток.'],
    ['Семь раз отмерь — один раз отрежь.', 'Сначала обдумай, потом делай.'],
    ['Любишь кататься — люби и саночки возить.', 'У любого удовольствия есть своя цена.'],
    ['Дело мастера боится.', 'Умелый человек справится с любым делом.'],
    ['Не боги горшки обжигают.', 'Научиться трудному может каждый.'],
    ['Труд человека кормит, а лень портит.', 'Работа даёт силы и достаток, лень их отнимает.'],
    ['Что посеешь, то и пожнёшь.', 'Результат зависит от твоих же поступков.'],
    ['Где хотенье, там и уменье.', 'Желание помогает научиться чему угодно.'],
    ['Кто ищет, тот всегда найдёт.', 'Настойчивость приводит к цели.'],
    ['Взялся за гуж — не говори, что не дюж.', 'Начал дело — доводи его до конца.'],
    ['Ученье — свет, а неученье — тьма.', 'Знания открывают дорогу.'],
    ['Мал золотник, да дорог.', 'Маленькое может быть очень ценным.'],
    ['Всякому овощу своё время.', 'Каждому делу — свой срок.'],
    ['Хвали день к вечеру.', 'О дне судят по тому, что успел к вечеру.'],
  ];
  /*
   * Погода. Пока человек не разрешил место — пример, так и подписан. После разрешения прогноз приходит с Open-Meteo
   * (бесплатно, без ключа): координаты округляются до 0,1° (около 10 км) и хранятся только на телефоне, прогноз
   * обновляется раз в час. На странице, где сеть или место недоступны, остаётся пример.
   */
  const SAMPLE = {
    now: 4, hi: 9, lo: 1, text: 'Ясно', more: 'без осадков', feel: 2, wind: 3, rain: 0, rise: '07:42', set: '16:31', icon: 'sun',
    hours: [['08', 'sun', 4], ['11', 'sun', 7], ['14', 'weather', 9], ['17', 'cloud', 6], ['20', 'cloud', 3]],
  };
  let W = SAMPLE;
  /** Температура со знаком: «+4°», «−3°», «0°». */
  const deg = (t) => `${t > 0 ? '+' : t < 0 ? '−' : ''}${Math.abs(t)}°`;
  /* Коды погоды WMO → подпись и значок. */
  const WMO = [[0, 'Ясно', 'sun'], [1, 'Почти ясно', 'sun'], [2, 'Переменная облачность', 'weather'], [3, 'Пасмурно', 'cloud'], [45, 'Туман', 'cloud'], [51, 'Морось', 'rain'],
    [61, 'Дождь', 'rain'], [66, 'Ледяной дождь', 'rain'], [71, 'Снег', 'cloud'], [77, 'Снежная крупа', 'cloud'], [80, 'Ливень', 'rain'], [85, 'Снегопад', 'cloud'], [95, 'Гроза', 'rain']];
  const wmo = (c) => WMO.reduce((best, x) => (c >= x[0] ? x : best), WMO[0]);
  const hhmm = (iso) => String(iso || '').slice(11, 16);
  /** Ответ Open-Meteo → та же форма, что у примера. */
  function fromApi(j) {
    const c = j.current, d = j.daily, h = j.hourly, [, text, icon] = wmo(c.weather_code);
    const at = Math.max(0, h.time.findIndex((t) => t.slice(0, 13) === String(c.time).slice(0, 13))), prob = (d.precipitation_probability_max || [0])[0] || 0;
    return {
      now: Math.round(c.temperature_2m), hi: Math.round(d.temperature_2m_max[0]), lo: Math.round(d.temperature_2m_min[0]), text, icon,
      more: prob >= 30 ? `осадки до ${prob} %` : 'без осадков', feel: Math.round(c.apparent_temperature), wind: Math.round(c.wind_speed_10m), rain: prob,
      rise: hhmm(d.sunrise[0]), set: hhmm(d.sunset[0]), real: true, at: Date.now(),
      hours: [1, 4, 7, 10, 13].map((k) => h.time[at + k] && [h.time[at + k].slice(11, 13), wmo(h.weather_code[at + k])[2], Math.round(h.temperature_2m[at + k])]).filter(Boolean),
    };
  }
  /** Перед отрисовкой: настоящий прогноз, если он есть (до 12 часов), иначе пример. */
  const syncWx = (s) => { const d = s.wx && s.wx.data; W = d && Date.now() - d.at < 12 * 3600e3 ? d : SAMPLE; };
  function fetchWx(s) {
    const { lat, lon } = s.wx.coords;
    const q = `latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max&wind_speed_unit=ms&timezone=auto&forecast_days=2`;
    return fetch('https://api.open-meteo.com/v1/forecast?' + q).then((r) => (r.ok ? r.json() : Promise.reject(new Error('http ' + r.status)))).then((j) => { s.wx.data = fromApi(j); return s.wx.data; });
  }
  /** Тихое обновление раз в час, если место уже разрешено. Без запросов разрешения. */
  function refreshWx(flow) {
    const s = flow.state;
    if (flow.shot || !s.wx || !s.wx.coords || (s.wx.data && Date.now() - s.wx.data.at < 3600e3) || s.wx.busy) return;
    s.wx.busy = true;
    fetchWx(s).then(() => { if (flow.id === 'morning' && !flow.sheets.innerHTML) flow.rerender(true); }, () => {}).finally(() => { s.wx.busy = false; });
  }
  /** «Погода для моего места»: один запрос места и прогноз. */
  function askWx(flow) {
    const s = flow.state, again = () => { if (s._story != null && flow.sheets.querySelector('.sy')) story(flow, s._story); };
    if (!navigator.geolocation) { s._wxMsg = 'Этот браузер не умеет определять место'; again(); return; }
    s._wxMsg = 'Определяю место…';
    again();
    navigator.geolocation.getCurrentPosition((pos) => {
      s.wx = { coords: { lat: +pos.coords.latitude.toFixed(1), lon: +pos.coords.longitude.toFixed(1) } };
      fetchWx(s).then(() => { s._wxMsg = ''; again(); if (flow.id === 'morning') flow.rerender(true); }, () => { s._wxMsg = 'Прогноз не пришёл — попробуй позже'; again(); });
    }, (e) => { s._wxMsg = e && e.code === 1 ? 'Без доступа к месту погода остаётся примером' : 'Место не определилось — попробуй ещё раз'; again(); }, { timeout: 12000, maximumAge: 3600e3 });
  }
  /* Что показать после подъёма: id, название, значок, два цвета градиента, подпись в настройках. */
  const BRIEF = [
    ['weather', 'Погода', 'weather', '#3D8DFF', '#1A5AD6', 'Сейчас и по часам'],
    ['word', 'Слово дня', 'book', '#8E6CFF', '#5636D4', 'Слово, толкование и пример'],
    ['saying', 'Поговорка', 'quote', '#FF9A3C', '#E15A16', 'Народная мудрость и её смысл'],
  ];
  /* Небо карточки утра: чем раньше встал, тем темнее. Опорные точки по минутам суток, между ними цвет плавно смешивается. */
  const SKY = [[240, [14, 20, 46], [52, 42, 92]], [330, [27, 35, 70], [226, 116, 92]], [390, [50, 64, 122], [252, 160, 92]], [450, [76, 118, 196], [255, 204, 104]], [510, [124, 176, 234], [255, 230, 166]], [600, [146, 196, 242], [255, 242, 190]]];

  /* На другом языке — свои слова и пословицы (js/i18n/words.js): русское слово дня в переводе теряет смысл. */
  const ownOf = (k) => { const l = Sonly.i18n && Sonly.i18n.lang, L = l && l !== 'ru' && Sonly.I18N_WORDS && Sonly.I18N_WORDS[l]; return L && L[k] && L[k].length ? L[k] : null; };
  const wordOf = () => { const list = ownOf('words') || WORDS; return list[doy() % list.length]; };
  const sayingOf = () => { const list = ownOf('sayings') || SAYINGS; return list[doy() % list.length]; };
  /* Подарки за серию: пейзажи, которые открывает серия (SCENES ниже), — по лучшей серии, навсегда. */
  const REWARDS = [[3, 'sea'], [7, 'mountains'], [14, 'forest'], [21, 'dunes'], [30, 'aurora']];
  const rewards = (s) => { const best = K.stats(s).best; return REWARDS.map(([n, id]) => ({ n, id, name: sceneOf(id)[1], open: best >= n })); };
  const briefOf = (s) => s.brief || (s.brief = { weather: true, word: true, saying: true });
  const seenOf = (s) => (s.seen && s.seen.d === today() ? s.seen.ids : (s.seen = { d: today(), ids: {} }).ids);
  const grad = (b) => `--c1:${b[3]};--c2:${b[4]}`;
  const utr = (n) => K.pl(n, 'утро', 'утра', 'утр');

  function skyOf(min) {
    const m = Math.max(240, Math.min(600, min));
    let k = SKY.findIndex((x) => m <= x[0]);
    if (k < 1) k = 1;
    const [m0, a0, b0] = SKY[k - 1], [m1, a1, b1] = SKY[k], t = (m - m0) / (m1 - m0);
    const mix = (p, q) => p.map((v, i) => Math.round(v + (q[i] - v) * t));
    const a = mix(a0, a1), b = mix(b0, b1), lum = (0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2]) / 255;
    return { a: `rgb(${a})`, b: `rgb(${b})`, A: a, B: b, ink: lum > 0.56 ? '#0D0D0F' : '#fff', night: m < 330, sun: (m - 240) / 360 };
  }
  /** Псевдослучайные числа от даты: открытка одного дня всегда одинаковая. */
  const rnd = (seed) => { let x = Math.floor(seed / 864e5) * 9301 + 49297; return () => ((x = (x * 9301 + 49297) % 233280) / 233280); };

  /* ── Сводка «После подъёма»: листаемые карточки ─────────── */

  const CARD = {
    weather: () => `<header><small>${si('weather', 15)}Погода</small><span>сейчас</span></header>
      <div class="bf-wx"><b>${deg(W.now)}</b><span><i>${W.text}</i>днём до ${deg(W.hi)}</span><em class="bf-sun i-${W.icon}">${si(W.icon, 46)}</em></div>
      <div class="bf-hours">${W.hours.slice(0, 4).map(([h, g, t]) => `<span><small>${h}:00</small>${si(g, 18)}<b>${deg(t)}</b></span>`).join('')}</div>`,
    word: () => { const w = wordOf(); return `<header><small>${si('book', 15)}Слово дня</small><span>${w[1]}</span></header><b class="bf-w${w[0].length > 12 ? ' long' : ''}">${w[0]}</b><p>${nb(w[2])}</p>`; },
    saying: () => { const q = sayingOf(); return `<header><small>${si('quote', 15)}Поговорка</small></header><b class="bf-q">${nb(q[0])}</b><p>${nb(q[1])}</p>`; },
  };
  /** Карточки сводки. На главной «Утра» и на экране «Доброе утро» они одни и те же; нажатие открывает историю. */
  function briefCards(s, cls = '') {
    syncWx(s);
    const b = briefOf(s), list = BRIEF.filter((x) => b[x[0]]);
    if (!list.length) return '';
    return `<div class="bf ${cls}"><div class="bf-track">${list.map((x) => `<button class="bf-card bf-${x[0]}" data-act="mo-story:${x[0]}" style="${grad(x)}">${CARD[x[0]]()}</button>`).join('')}</div>
      ${list.length > 1 ? `<div class="bf-dots" aria-hidden="true">${list.map((_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</div>` : ''}</div>`;
  }
  /* Точки под карточками следят за прокруткой — один слушатель на всё приложение. */
  document.addEventListener('scroll', (e) => {
    const t = e.target;
    if (!t.classList || !t.classList.contains('bf-track')) return;
    const kids = [...t.children], at = t.scrollLeft;
    const i = kids.reduce((best, el, k) => (Math.abs(el.offsetLeft - kids[0].offsetLeft - at) < Math.abs(kids[best].offsetLeft - kids[0].offsetLeft - at) ? k : best), 0);
    t.parentNode.querySelectorAll('.bf-dots i').forEach((d, k) => d.classList.toggle('on', k === i));
  }, true);

  /* ── Истории дня: погода, слово, поговорка на весь экран ── */

  const STORY = {
    weather: (s) => `<div class="sy-wx"><b>${deg(W.now)}</b><em class="i-${W.icon}">${si(W.icon, 92)}</em></div>
      <p class="sy-lead">${W.text}, ${W.more}</p><p class="sy-sub">Днём до ${deg(W.hi)}, ночью до ${deg(W.lo)}</p>
      <div class="sy-hours">${W.hours.map(([h, g, t]) => `<span><small>${h}:00</small>${si(g, 24)}<b>${deg(t)}</b></span>`).join('')}</div>
      <div class="sy-grid">${[['temp', 'Ощущается', deg(W.feel)], ['wind', 'Ветер', `${W.wind} м/с`], ['rise', 'Восход', W.rise], ['set', 'Закат', W.set]].map(([g, n, v]) => `<span>${si(g, 18)}<small>${n}</small><b>${v}</b></span>`).join('')}</div>
      ${W.real ? '<p class="sy-fine">Данные: Open-Meteo.com</p>' : `<button class="sy-geo" data-act="mo-geo">${si('weather', 17)}Погода для моего места</button><p class="sy-fine">${s && s._wxMsg ? s._wxMsg : 'Сейчас пример. Место нужно только для прогноза и хранится на телефоне.'}</p>`}`,
    word: () => { const w = wordOf(); return `<b class="sy-word${w[0].length > 12 ? ' long' : ''}">${w[0]}</b><em class="sy-pos">${w[1]}</em><p class="sy-lead">${nb(w[2])}</p>
      <div class="sy-glass"><small>Пример</small><p>${nb(`«${w[3]}»`)}</p></div>`; },
    saying: () => { const q = sayingOf(); return `<i class="sy-qm">${si('quote', 54)}</i><b class="sy-say">${nb(q[0])}</b>
      <div class="sy-glass"><small>Смысл</small><p>${nb(q[1])}</p></div>`; },
  };
  const STORY_MS = 7000;
  function story(flow, k) {
    const s = flow.state, b = briefOf(s), x = BRIEF[k], [id, name, glyph] = x;
    syncWx(s);
    s._story = k;
    seenOf(s)[id] = 1;
    const day = cap(new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }));
    flow.sheet(`<div class="sy" data-k="${id}" style="${grad(x)}">
      <div class="sy-bars">${BRIEF.map((_, i) => `<i class="${i < k ? 'done' : i === k ? 'on' : ''}"><u></u></i>`).join('')}</div>
      <header class="sy-top"><i class="sy-ic">${si(glyph, 19)}</i><span><b>${name}</b><small>${day}</small></span><button class="sy-x" data-act="sy-close" aria-label="Закрыть">${ic('x', 21, 2.4)}</button></header>
      <div class="sy-body">${STORY[id](s)}</div>
      <button class="sy-nav prev" data-act="sy-go:-1" aria-label="Предыдущая"></button><button class="sy-nav next" data-act="sy-go:1" aria-label="Следующая"></button>
      <footer class="sy-foot"><span>${si('sun', 17)}Показывать после подъёма</span><button class="ap-tg sm${b[id] ? ' on' : ''}" data-act="mo-flag:${id}:story" role="switch" aria-checked="${!!b[id]}" aria-label="Показывать после подъёма"></button></footer></div>`, 'ap-story');
    /* Полоска сверху заполняется 7 секунд, потом история листается сама. Пока палец на экране — пауза. */
    const root = flow.sheets.querySelector('.sy'), bar = root && root.querySelector('.sy-bars .on u');
    /* Крупное слово или поговорка не вылезают за край: шрифт уменьшается, пока самый длинный кусок не влезет (не меньше 24 px). */
    if (root) root.querySelectorAll('.sy-word,.sy-say').forEach((el) => { let fs = parseFloat(getComputedStyle(el).fontSize); for (let i = 0; i < 16 && el.scrollWidth > el.clientWidth + 1 && fs > 24; i++) { fs -= 2; el.style.fontSize = fs + 'px'; } });
    if (!root || flow.still) return;
    bar.style.animationDuration = STORY_MS + 'ms';
    bar.addEventListener('animationend', () => { if (flow.sheets.contains(root)) storyGo(flow, 1); });
    /* Долгое удержание — это пауза, чтобы дочитать: отпущенный после него палец историю не листает. */
    let t0 = 0;
    const hold = (on) => root.classList.toggle('hold', on);
    root.addEventListener('pointerdown', (e) => { if (!e.target.closest('.sy-x,.sy-foot')) { t0 = Date.now(); hold(true); } });
    root.addEventListener('pointerup', () => { if (t0 && Date.now() - t0 > 350) root.dataset.held = '1'; t0 = 0; hold(false); });
    ['pointercancel', 'pointerleave'].forEach((t) => root.addEventListener(t, () => { t0 = 0; hold(false); }));
  }
  function storyGo(flow, dir) {
    const s = flow.state, k = (s._story || 0) + dir;
    if (k >= BRIEF.length) { closeStory(flow); return; }
    story(flow, Math.max(0, k));
  }
  function closeStory(flow) {
    flow.closeSheet();
    /* Кружки историй перекрашиваются в «просмотрено». */
    if (flow.id === 'morning') flow.rerender(true);
  }

  /* ── Карточки утра: открытки с пейзажем ──────────────────── */

  const dShort = (d) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
  const f1 = (v) => v.toFixed(1);
  const mixc = (p, q, t) => p.map((v, i) => Math.round(v + (q[i] - v) * t));
  const rgb = (c) => `rgb(${c})`;
  /**
   * Пейзажи открыток, рисунок 120 × 160, горизонт около 124. r — случайные числа дня (форма одна и та же для одной даты),
   * c — цвета слоёв от неба: far — дальний, near — ближний, x — где солнце (для дорожки на воде).
   */
  const LAND = {
    city(r, c) {
      let far = '', near = '', win = '';
      for (let x = -4; x < 124;) { const w = 7 + r() * 10, h = 24 + r() * 36; far += `M${f1(x)} 160V${f1(160 - h)}h${f1(w)}V160z`; x += w + 1; }
      for (let x = -3; x < 124;) {
        const w = 10 + r() * 14, h = 14 + r() * 24;
        near += `M${f1(x)} 160V${f1(160 - h)}h${f1(w)}V160z`;
        for (let k = 0; k < 3; k++) if (r() > 0.5) win += `<rect x="${f1(x + 2 + r() * (w - 5))}" y="${f1(160 - h + 4 + r() * (h - 9))}" width="2" height="2.6" rx=".5"/>`;
        x += w + 1.4;
      }
      return `<path d="${far}" fill="${c.far}"/><path d="${near}" fill="${c.near}"/><g fill="#FFD66B" opacity=".9">${win}</g>`;
    },
    field(r, c) {
      const y1 = 120 + r() * 6, y2 = 134 + r() * 6, tx = 18 + r() * 84;
      return `<path d="M0 ${f1(y1)}Q30 ${f1(y1 - 12 - r() * 8)} 60 ${f1(y1)}T120 ${f1(y1 - 3)}V160H0z" fill="${c.far}"/>
        <path d="M0 ${f1(y2)}Q${f1(36 + r() * 30)} ${f1(y2 - 18)} 120 ${f1(y2 + 2)}V160H0z" fill="${c.near}"/>
        <path d="M${f1(tx)} ${f1(y2 - 4)}v-9" stroke="${c.near}" stroke-width="1.6"/><circle cx="${f1(tx)}" cy="${f1(y2 - 16)}" r="6" fill="${c.near}"/>`;
    },
    sea(r, c) {
      const ix = r() > 0.5 ? 8 + r() * 20 : 78 + r() * 24, lines = [130, 135, 140, 146, 152].map((y, k) => `<path d="M${f1(c.x - 15 + k * 2.6 + r() * 3)} ${y}h${f1(28 - k * 4.4)}"/>`).join('');
      return `<path d="M${f1(ix)} 124q9 -9 22 0z" fill="${c.far}"/><rect y="124" width="120" height="36" fill="${c.water}"/><rect y="124" width="120" height="1.2" fill="${c.glow}" opacity=".35"/>
        <g stroke="${c.glow}" stroke-width="1.6" stroke-linecap="round" opacity=".75">${lines}</g><rect y="148" width="120" height="12" fill="${c.near}" opacity=".55"/>`;
    },
    mountains(r, c) {
      let far = 'M0 160V112', near = 'M0 160V132', snow = '';
      for (let x = 0; x < 120;) { const w = 16 + r() * 18, top = 82 + r() * 22; far += `L${f1(x + w / 2)} ${f1(top)}L${f1(x + w)} ${f1(104 + r() * 10)}`; if (top < 96) snow += `<path d="M${f1(x + w / 2)} ${f1(top)}l-4 6h8z"/>`; x += w; }
      for (let x = 0; x < 120;) { const w = 22 + r() * 22; near += `L${f1(x + w / 2)} ${f1(108 + r() * 12)}L${f1(x + w)} ${f1(128 + r() * 8)}`; x += w; }
      return `<path d="${far}V160z" fill="${c.far}"/><g fill="#fff" opacity=".7">${snow}</g><path d="${near}V160z" fill="${c.near}"/>`;
    },
    forest(r, c) {
      const pine = (x, base, h) => `M${f1(x)} ${f1(base - h)}L${f1(x + h * 0.32)} ${f1(base)}H${f1(x - h * 0.32)}z`;
      let far = '', near = '';
      for (let x = -2; x < 124; x += 5 + r() * 4) far += pine(x, 128 + r() * 3, 12 + r() * 9);
      for (let x = -4; x < 126; x += 11 + r() * 9) near += pine(x, 162, 28 + r() * 18);
      return `<path d="M0 126H120V160H0z" fill="${c.far}"/><path d="${far}" fill="${c.far}"/><path d="${near}" fill="${c.near}"/>`;
    },
    dunes(r, c) {
      const y1 = 122 + r() * 6, y2 = 136 + r() * 6;
      return `<path d="M0 ${f1(y1)}C30 ${f1(y1 - 14)} 50 ${f1(y1 + 6)} 76 ${f1(y1 - 4)}S110 ${f1(y1 - 10)} 120 ${f1(y1)}V160H0z" fill="${c.warm}"/>
        <path d="M0 ${f1(y2)}C26 ${f1(y2 + 8)} 54 ${f1(y2 - 16)} 120 ${f1(y2 - 2)}V160H0z" fill="${c.near}"/>`;
    },
    aurora(r, c) {
      const stars = Array.from({ length: 14 }, () => `<circle cx="${f1(r() * 120)}" cy="${f1(r() * 70)}" r="${f1(0.4 + r() * 0.6)}"/>`).join('');
      return `<g fill="#fff" opacity=".8">${stars}</g><g style="filter:blur(3px)" opacity=".75"><path d="M-10 ${f1(40 + r() * 10)}C30 ${f1(14 + r() * 10)} 70 ${f1(70 + r() * 10)} 130 ${f1(26 + r() * 10)}" stroke="#4DFFB4" stroke-width="12" fill="none"/>
        <path d="M-10 ${f1(62 + r() * 8)}C40 ${f1(40 + r() * 8)} 80 ${f1(86 + r() * 8)} 130 ${f1(50 + r() * 8)}" stroke="#9B7BFF" stroke-width="8" fill="none" opacity=".8"/></g>
        <path d="M0 132Q40 116 76 128T120 124V160H0z" fill="#D8E6F2" opacity=".9"/><path d="M0 146Q50 134 120 144V160H0z" fill="#B9CDE0"/>`;
    },
  };
  /* Пейзажи: два есть сразу, остальные открывает серия. Это и есть подарки за серию. */
  const SCENES = [['city', 'Город', 0], ['field', 'Поле', 0], ['sea', 'Море', 3], ['mountains', 'Горы', 7], ['forest', 'Лес', 14], ['dunes', 'Дюны', 21], ['aurora', 'Северное сияние', 30]];
  const sceneOf = (id) => SCENES.find((x) => x[0] === id) || SCENES[0];
  /* В узкой плитке — короткое название, чтобы подпись стояла в одну строку. */
  const short = (sc) => (sc[0] === 'aurora' ? 'Сияние' : sc[1]);
  /** Лучшая серия на каждый день истории: пейзаж открытки берётся из открытых к этому утру. */
  function bestByDay(s, h) {
    const plan = (d) => s.alarms.some((a) => !a.once && a.days.includes((d.getDay() + 6) % 7)), out = new Map();
    let run = 0, best = 0, prev = null;
    h.forEach((x) => {
      let broke = !prev;
      for (let d = prev && new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1); d && d < x.d; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) if (plan(d)) { broke = true; break; }
      run = broke ? 1 : run + 1;
      best = Math.max(best, run);
      out.set(x.d.getTime(), best);
      prev = x.d;
    });
    return out;
  }
  /** Пейзаж дня: в день, когда серия открыла новый, — он; в остальные — один из открытых, по дате. */
  function landOf(x, best) {
    const open = SCENES.filter((sc) => sc[2] <= best), fresh = open.find((sc) => sc[2] && sc[2] === best);
    return (fresh || open[Math.floor(rnd(x.d.getTime())() * open.length)])[0];
  }
  /** Цвета открытки: небо по времени подъёма, слои пейзажа — от цвета неба у горизонта. «Северное сияние» — всегда ночь. */
  function tone(x, land) {
    const k = skyOf(land === 'aurora' ? 300 : x.wake), r = rnd(x.d.getTime() + 7), sx = Math.round((r() - 0.5) * 44);
    if (land === 'aurora') Object.assign(k, { A: [8, 14, 38], B: [20, 52, 78], a: 'rgb(8,14,38)', b: 'rgb(20,52,78)', ink: '#fff', sun: 0 });
    const ground = [10, 12, 26];
    return { k, sx, far: rgb(mixc(mixc(k.B, k.A, 0.45), ground, 0.38)), near: rgb(mixc(k.B, ground, 0.72)), warm: rgb(mixc(mixc(k.B, [214, 150, 90], 0.5), ground, 0.25)), water: rgb(mixc(mixc(k.A, k.B, 0.3), ground, 0.28)), glow: 'rgba(255,240,196,.95)', x: 60 + sx * 1.2 };
  }
  /* Находки на открытке: иногда в небе что-то есть. Выпадает по дате — у одного утра всегда одно и то же.
     lvl 0 — обычная (птицы), 1 — редкая (примерно раз в неделю), 2 — очень редкая (примерно раз в месяц).
     Рисунок в той же сетке 120 × 160; всё, что в небе, лежит под пейзажем — радуга выходит из-за холмов. */
  const RAIN = ['#FF6B6B', '#FFA94D', '#FFE066', '#69DB7C', '#4DABF7', '#9775FA'];
  const arcs = (cx, R, o) => `<g fill="none" stroke-width="1.9" opacity="${o}">${RAIN.map((c, i) => `<path d="M${f1(cx - R + i * 1.8)} 128A${f1(R - i * 1.8)} ${f1(R - i * 1.8)} 0 0 1 ${f1(cx + R - i * 1.8)} 128" stroke="${c}"/>`).join('')}</g>`;
  const FIND = {
    birds: ['Птицы', 0, (r, t) => {
      let d = '';
      const n = 3 + Math.floor(r() * 3), x0 = 16 + r() * 66, y0 = 102 + r() * 8;
      for (let i = 0; i < n; i++) { const x = x0 + i * (5 + r() * 3), y = y0 + (i % 2) * 2.6 - r() * 3, w = 2 + r() * 1.1; d += `M${f1(x - w)} ${f1(y - w * 0.5)}Q${f1(x - w / 2)} ${f1(y - w)} ${f1(x)} ${f1(y)}Q${f1(x + w / 2)} ${f1(y - w)} ${f1(x + w)} ${f1(y - w * 0.5)}`; }
      return `<g class="mo-fly"><path d="${d}" fill="none" stroke="${t.k.night ? 'rgba(255,255,255,.7)' : 'rgba(18,20,34,.62)'}" stroke-width=".8" stroke-linecap="round"/></g>`;
    }],
    rainbow: ['Радуга', 1, (r, t) => arcs(t.x > 60 ? 32 + r() * 8 : 80 + r() * 8, 30, 0.55)],
    double: ['Двойная радуга', 2, (r, t) => { const cx = t.x > 60 ? 34 : 86; return arcs(cx, 27, 0.6) + arcs(cx, 38, 0.32); }],
    balloon: ['Воздушный шар', 1, (r) => {
      const x = 20 + r() * 80, y = 103 + r() * 5, c = ['#FF6B6B', '#FFA94D', '#4DABF7', '#9775FA'][Math.floor(r() * 4)];
      return `<g class="mo-float"><ellipse cx="${f1(x)}" cy="${f1(y)}" rx="5.4" ry="6.6" fill="${c}"/><path d="M${f1(x)} ${f1(y - 6.6)}C${f1(x - 2.4)} ${f1(y - 3.6)} ${f1(x - 2.4)} ${f1(y + 3.6)} ${f1(x)} ${f1(y + 6.6)}C${f1(x + 2.4)} ${f1(y + 3.6)} ${f1(x + 2.4)} ${f1(y - 3.6)} ${f1(x)} ${f1(y - 6.6)}z" fill="#fff" opacity=".38"/>
        <path d="M${f1(x - 2.8)} ${f1(y + 5.4)}L${f1(x - 1.1)} ${f1(y + 9.2)}M${f1(x + 2.8)} ${f1(y + 5.4)}L${f1(x + 1.1)} ${f1(y + 9.2)}" stroke="#3A2A20" stroke-width=".45"/><rect x="${f1(x - 1.4)}" y="${f1(y + 9)}" width="2.8" height="2.2" rx=".4" fill="#6B4A2E"/></g>`;
    }],
    kite: ['Воздушный змей', 1, (r) => {
      const x = 24 + r() * 72, y = 104 + r() * 5;
      return `<g class="mo-float"><path d="M${f1(x)} ${f1(y - 5)}L${f1(x + 3.6)} ${f1(y)}L${f1(x)} ${f1(y + 6)}L${f1(x - 3.6)} ${f1(y)}z" fill="#FF6B6B"/><path d="M${f1(x)} ${f1(y - 5)}V${f1(y + 6)}M${f1(x - 3.6)} ${f1(y)}H${f1(x + 3.6)}" stroke="#fff" stroke-width=".4" opacity=".75"/><path d="M${f1(x)} ${f1(y + 6)}q-3 4 0 7t0 7" stroke="#FFE066" stroke-width=".7" fill="none"/></g>`;
    }],
    plane: ['Самолёт', 1, (r) => {
      const y1 = 108 + r() * 5, y2 = y1 - 4 - r() * 5, left = r() > 0.5, xa = left ? -6 : 126, xb = left ? 62 + r() * 30 : 58 - r() * 30;
      return `<path d="M${xa} ${f1(y1)}L${f1(xb)} ${f1(y2)}" stroke="#fff" stroke-width=".9" opacity=".6" stroke-linecap="round"/><circle cx="${f1(xb)}" cy="${f1(y2)}" r="1" fill="#fff"/>`;
    }],
    shooting: ['Падающая звезда', 1, (r) => {
      const x = 40 + r() * 56, y = 104 + r() * 5;
      return `<g class="mo-shoot"><path d="M${f1(x - 20)} ${f1(y - 8)}L${f1(x)} ${f1(y)}" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".55"/><path d="M${f1(x - 8)} ${f1(y - 3.2)}L${f1(x)} ${f1(y)}" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/><circle cx="${f1(x)}" cy="${f1(y)}" r="1.2" fill="#fff"/></g>`;
    }],
    comet: ['Комета', 2, (r) => {
      const x = 72 + r() * 26, y = 106 + r() * 5;
      return `<path d="M${f1(x - 30)} ${f1(y - 11)}L${f1(x)} ${f1(y - 1.8)}L${f1(x)} ${f1(y + 1.8)}z" fill="#DDF7FF" opacity=".42"/><path d="M${f1(x - 16)} ${f1(y - 6)}L${f1(x)} ${f1(y - 1)}L${f1(x)} ${f1(y + 1)}z" fill="#fff" opacity=".55"/><circle cx="${f1(x)}" cy="${f1(y)}" r="3" fill="#E9FBFF" opacity=".45"/><circle cx="${f1(x)}" cy="${f1(y)}" r="1.5" fill="#fff"/>`;
    }],
  };
  /* Случайность находок: перемешивание номера дня (у соседних дней числа не идут по кругу, как у rnd). */
  const hash = (n) => { n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const mix = (seed, salt) => { let i = 0; const d = Math.floor(seed / 864e5); return () => hash(d * 7919 + salt * 104729 + (i++) * 15485863); };
  /* Что летает — птицы, шар, змей, самолёт — рисуется поверх пейзажа; радуга, звёзды и комета — за ним. */
  const FRONT = ['birds', 'balloon', 'kite', 'plane'];
  /** Находка этого утра (или null). Свой ряд случайных чисел — не тот, что выбирает пейзаж и солнце. */
  function findOf(x, land, t) {
    const r = mix(x.d.getTime(), 977), p = r(), dark = land === 'aurora' || t.k.night;
    const id = p < 0.035 ? (dark ? 'comet' : 'double') : p < 0.17 ? (dark ? ['shooting', 'shooting', 'balloon'] : ['rainbow', 'balloon', 'plane', 'kite'])[Math.floor(r() * (dark ? 3 : 4))] : p < 0.45 ? 'birds' : '';
    if (!id) return null;
    const [name, lvl, draw] = FIND[id], g = `<g class="mo-find f-${id}">${draw(r, t)}</g>`, front = FRONT.includes(id);
    return { id, name, lvl, back: front ? '' : g, front: front ? g : '' };
  }
  const findNote = (f) => (f.lvl === 2 ? 'Очень редкая находка — примерно раз в месяц' : 'Редкая находка — раз в одну-две недели');
  /** Солнце над горизонтом: чем раньше встал, тем ниже оно стоит. Пейзаж лежит поверх — солнце встаёт из-за него. */
  const sunSvg = (t) => (t.k.sun ? `<g class="mo-sun"><circle cx="${f1(t.x)}" cy="${f1(130 - t.k.sun * 34)}" r="17" fill="#FFE9A6" opacity=".28"/><circle cx="${f1(t.x)}" cy="${f1(130 - t.k.sun * 34)}" r="7.5" fill="#FFF3C4"/></g>` : '');
  const landSvg = (x, land, t, f = findOf(x, land, t)) => `<svg class="mo-land" viewBox="0 0 120 160" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${sunSvg(t)}${f ? f.back : ''}${LAND[land](rnd(x.d.getTime() + 3), t)}${f ? f.front : ''}</svg>`;
  /*
   * Открытки — картинки в одном стиле (img/cards): пейзаж и небо по времени подъёма — ночь до 5:30, рассвет до 7:00, дальше утро;
   * «Северное сияние» — всегда ночь. Нарисованный SVG лежит под картинкой: пока она грузится или если не загрузилась, виден он.
   */
  const phaseOf = (wake, land) => (land === 'aurora' || wake < 330 ? 'night' : wake < 420 ? 'dawn' : 'morning');
  const PHASE = { night: ['#0E142E', '#342A5C', '#fff'], dawn: ['#32407A', '#FCA05C', '#fff'], morning: ['#7CB0EA', '#FFE6A6', '#0D0D0F'] };
  const artOf = (land, wake) => `${land}-${phaseOf(wake, land)}.webp`;
  /* Маленькая картинка для плиток и стопок, большая — для открытки крупно и для «Сохранить». */
  const artImg = (land, wake, sizes) => `<img class="mo-art" src="img/cards/s/${artOf(land, wake)}" srcset="img/cards/s/${artOf(land, wake)} 360w, img/cards/${artOf(land, wake)} 1080w" sizes="${sizes}" alt="" decoding="async" draggable="false" onerror="this.remove()">`;
  /*
   * Находка — стикер в небе: где (доля ширины и высоты открытки, от левого верхнего угла) и какого размера (доля ширины).
   * Небо сверху занято датой и временем, горизонт — на 70 % высоты; радуга встаёт ногами на горизонт и тает к земле.
   */
  const STICK = {
    birds: (r) => ({ w: 28, x: 10 + r() * 50, y: 36 + r() * 12 }),
    rainbow: (r) => ({ w: 64, x: r() > 0.5 ? 2 : 34, y: 46.5, arc: true }),
    double: (r) => ({ w: 72, x: r() > 0.5 ? 0 : 28, y: 42, arc: true }),
    balloon: (r) => ({ w: 15, x: 10 + r() * 64, y: 30 + r() * 14 }),
    kite: (r) => ({ w: 12, x: 12 + r() * 64, y: 30 + r() * 12 }),
    plane: (r) => ({ w: 20, x: 22 + r() * 46, y: 25 + r() * 12, flip: r() > 0.5 }),
    shooting: (r) => ({ w: 24, x: 50 + r() * 22, y: 14 + r() * 14 }),
    comet: (r) => ({ w: 32, x: 52 + r() * 12, y: 12 + r() * 12 }),
  };
  const stickOf = (f, x) => (f && STICK[f.id] ? STICK[f.id](mix(x.d.getTime(), 4243)) : null);
  const stickImg = (f, x) => {
    const p = stickOf(f, x);
    return p ? `<img class="mo-stk f-${f.id}${p.arc ? ' arc' : ''}${p.flip ? ' flip' : ''}" src="img/cards/find-${f.id}.webp" alt="" style="left:${f1(p.x)}%;top:${f1(p.y)}%;width:${p.w}%" decoding="async" draggable="false" onerror="this.remove()">` : '';
  };
  /** Рекорды коллекции: самый ранний подъём и самое быстрое задание. */
  const records = (h) => ({ early: Math.min(...h.map((x) => x.wake)), fast: Math.min(...h.filter((x) => x.secs).map((x) => x.secs)) });
  /**
   * Открытка утра. o.tag — 'div' внутри другой кнопки; o.best — лучшая серия к этому утру; o.rec — рекорды; o.land — пейзаж заранее.
   * На маленькой — только время и дата; рекорд — золотая рамка и значок.
   */
  function cardOf(x, o = {}) {
    const land = o.land || landOf(x, o.best == null ? 0 : o.best), t = tone(x, land), tag = o.tag || 'button', f = findOf(x, land, t), [ca, cb, ink] = PHASE[phaseOf(x.wake, land)];
    const early = o.rec && x.wake === o.rec.early, fast = o.rec && x.secs === o.rec.fast;
    const act = tag === 'button' ? ` data-act="mo-card:${x.d.getTime()}" aria-label="Открытка за ${x.d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}, подъём ${K.fmtMin(x.wake)}"` : '';
    return `<${tag} class="mo-card${early || fast ? ' gold' : ''}${o.nw ? ' is-new' : ''}"${act} style="--a:${ca};--b:${cb};--t:${ink};--sun:${t.k.sun.toFixed(2)};--sx:${t.sx}%">
      <i class="mo-card-sun"></i>${landSvg(x, land, t, f)}${artImg(land, x.wake, o.sizes || '120px')}${stickImg(f, x)}<small>${dShort(x.d)}</small><b>${K.fmtMin(x.wake)}</b>${f && f.lvl ? `<i class="mo-find-tag${f.lvl === 2 ? ' top' : ''}" title="${f.name}">${ic('sparkles', 11, 2.6)}</i>` : ''}
      ${early || fast ? `<i class="mo-rec">${early ? `<b title="Самый ранний подъём">${si('rise', 12)}</b>` : ''}${fast ? `<b title="Быстрее всего задание">${ic('zap', 11, 2.6)}</b>` : ''}</i>` : ''}</${tag}>`;
  }
  /** Образец пейзажа для подарков: тот же рисунок на рассветном небе. */
  const sample = (land, i = 0) => cardOf({ d: new Date(2026, 0, 3 + i * 5), wake: 400 }, { tag: 'div', land });
  const ghostStack = () => `<div class="mo-card ghost">${si('cards', 26)}</div>`;

  /** Картинка открытки 1080 × 1440 для «Сохранить»: пейзаж этого утра, находка в небе и подписи — как на экране. */
  function cardPng(x, n, best, done) {
    const land = landOf(x, best), t = tone(x, land), f = findOf(x, land, t), p = stickOf(f, x), ink = PHASE[phaseOf(x.wake, land)][2];
    const load = (src) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; });
    Promise.all([load(`img/cards/${artOf(land, x.wake)}`), p ? load(`img/cards/find-${f.id}.webp`) : null]).then(([bg, st]) => {
      if (!bg) { cardPngSvg(x, n, best, done); return; }
      const cv = document.createElement('canvas'), g = cv.getContext('2d'), w = 1080, h = 1440;
      cv.width = w; cv.height = h;
      g.drawImage(bg, 0, 0, w, h);
      if (st) {
        const sw = (w * p.w) / 100, sh = (sw * st.height) / st.width, off = document.createElement('canvas'), o = off.getContext('2d');
        off.width = Math.round(sw); off.height = Math.round(sh);
        if (p.flip) { o.translate(off.width, 0); o.scale(-1, 1); }
        o.drawImage(st, 0, 0, off.width, off.height);
        if (p.arc) { o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'destination-in'; const gr = o.createLinearGradient(0, 0, 0, off.height); gr.addColorStop(0.62, '#000'); gr.addColorStop(1, 'rgba(0,0,0,0)'); o.fillStyle = gr; o.fillRect(0, 0, off.width, off.height); }
        g.drawImage(off, (w * p.x) / 100, (h * p.y) / 100);
      }
      cardText(g, x, n, land, ink, w, h);
      done(cv.toDataURL('image/png'));
    });
  }
  /** Подписи на сохранённой открытке: дата, время подъёма, день недели и задание, внизу sonly и номер. */
  function cardText(g, x, n, land, ink, w, h) {
    const tk = x.task && TASKS.find((y) => y.id === x.task);
    g.fillStyle = ink;
    g.globalAlpha = 0.85; g.font = '600 50px Inter, sans-serif'; g.fillText(x.d.toLocaleDateString(LOC(), { day: 'numeric', month: 'long' }), 92, 172);
    g.globalAlpha = 1; g.font = '800 252px "Roboto Flex", Inter, sans-serif'; g.fillText(K.fmtMin(x.wake), 78, 420);
    g.globalAlpha = 0.88; g.font = '600 50px Inter, sans-serif'; g.fillText(cap(x.d.toLocaleDateString(LOC(), { weekday: 'long' })) + (tk ? ` · ${WD(tk.name)}` : ''), 92, 506);
    g.globalAlpha = 1; g.fillStyle = '#fff'; g.font = '800 66px "Roboto Flex", Inter, sans-serif'; g.fillText('sonly', 92, h - 104);
    g.textAlign = 'right'; g.font = '700 46px Inter, sans-serif'; g.fillText(`№ ${n} · ${WD(sceneOf(land)[1])}`, w - 92, h - 108);
  }
  /** Запасной путь «Сохранить» без картинок: тот же нарисованный SVG. */
  function cardPngSvg(x, n, best, done) {
    const land = landOf(x, best), t = tone(x, land), k = t.k;
    const cy = 160 - (160 * (-0.62 + 0.28 * k.sun) + 67.2);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440" viewBox="0 0 120 160"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${k.a}"/><stop offset="1" stop-color="${k.b}"/></linearGradient>
      <radialGradient id="s"><stop offset="0" stop-color="#FFF8D6"/><stop offset=".4" stop-color="#FFD660" stop-opacity=".62"/><stop offset=".72" stop-color="#FFC850" stop-opacity="0"/><stop offset="1" stop-color="#FFC850" stop-opacity="0"/></radialGradient></defs>
      <rect width="120" height="160" fill="url(#g)"/>${land === 'aurora' ? '' : `<circle cx="${f1(t.x)}" cy="${f1(cy)}" r="67.2" fill="url(#s)"/>`}${sunSvg(t)}${(findOf(x, land, t) || {}).back || ''}${LAND[land](rnd(x.d.getTime() + 3), t)}${(findOf(x, land, t) || {}).front || ''}</svg>`;
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas'), g = cv.getContext('2d'), w = 1080, h = 1440;
      cv.width = w; cv.height = h;
      g.drawImage(img, 0, 0, w, h);
      cardText(g, x, n, land, k.ink, w, h);
      done(cv.toDataURL('image/png'));
    };
    img.onerror = () => done(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* ── Экран «Утро» ────────────────────────────────────────── */

  app.screens.morning = {
    chrome: false,
    /* Погода обновляется тихо, если место уже разрешено. */
    mount(el, c) { refreshWx(c.flow); },
    render: (c) => {
      const s = c.s, st = K.stats(s), b = briefOf(s), seen = seenOf(s), rw = rewards(s), nx = rw.find((r) => !r.open), left = nx ? Math.max(1, nx.n - st.streak) : 0;
      const mini = st.h.slice(-3).reverse(), bestAt = bestByDay(s, st.h);
      return `<div class="ap-scroll scroll"><h1 class="ap-h1" data-in>Утро</h1>
        <div class="mo-brief" data-in style="--i:1">${BRIEF.map((x) => `<button class="mo-dot${seen[x[0]] ? ' seen' : ''}" data-act="mo-story:${x[0]}" style="${grad(x)}"><i>${si(x[2], 28)}</i><span>${x[1]}</span></button>`).join('')}
          <button class="mo-dot edit" data-act="mo-brief"><i>${si('sliders', 26)}</i><span>Настроить</span></button></div>
        <div class="ap-duo mo-duo" data-in style="--i:2">
          <button class="ap-card mo-tile" data-act="mo-gifts">${Sonly.news ? Sonly.news.tag(s, 'l') : ''}${ring(nx ? Math.min(1, st.streak / nx.n) : 1, `<i class="mo-gift">${si('gift', 30)}</i>`)}<b>${nx ? 'Новый пейзаж' : 'Все пейзажи твои'}</b><small>${nx ? `ещё ${left} ${utr(left)} подряд` : 'Они уже на открытках'}</small></button>
          <button class="ap-card mo-tile" data-act="mo-album">${Sonly.news ? Sonly.news.tag(s, 'c') : ''}<span class="mo-stack${mini.length ? '' : ' empty'}">${mini.length ? mini.map((x) => cardOf(x, { tag: 'div', best: bestAt.get(x.d.getTime()) })).join('') : ghostStack()}</span><b>Открытки утра</b><small>${st.h.length ? `${st.h.length} в коллекции` : 'Первая — после подъёма'}</small></button>
        </div>
        ${Sonly.people ? Sonly.people.card(s) : ''}
        <div class="ap-sec mo-sec" data-in style="--i:4"><h2>После подъёма</h2><button class="mo-link" data-act="mo-brief">Изменить</button></div>
        ${briefCards(s) ? `<div data-in style="--i:5">${briefCards(s)}</div>` : `<button class="ap-add" data-act="mo-brief" data-in style="--i:5">${si('sliders', 18)}Выбрать, что показывать</button>`}
      </div>`;
    },
  };

  /** Кольцо прогресса с картинкой внутри. */
  function ring(p, inner) {
    const C = 2 * Math.PI * 44;
    return `<span class="mo-ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="bg" cx="50" cy="50" r="44"/><circle class="fg" cx="50" cy="50" r="44" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - p)).toFixed(1)}"/></svg>${inner}</span>`;
  }
  const head = (title, close = 'sheet-close', icon = 'x') => `<div class="ap-sh-head"><button class="ap-x lg" data-act="${close}" aria-label="${icon === 'x' ? 'Закрыть' : 'Назад'}">${ic(icon === 'x' ? 'x' : 'chevron-left', icon === 'x' ? 20 : 22, 2.3)}</button><b>${title}</b><span class="ap-x ghost"></span></div>`;

  /* ── Листы ───────────────────────────────────────────────── */

  function briefSheet(flow) {
    const s = flow.state, b = briefOf(s), top = K.keepTop(flow);
    flow.sheet(`${head('После подъёма')}<div class="ap-sh-body scroll"><p class="mo-lead">Что показать на экране «Доброе утро», когда задание выполнено.</p>
      <div class="ap-card ap-list">${BRIEF.map((x) => `<div class="ap-row tall"><i class="ap-row-i c mo-grad" style="${grad(x)}">${si(x[2], 20)}</i><span>${x[1]}<small>${x[5]}</small></span><button class="ap-tg sm${b[x[0]] ? ' on' : ''}" data-act="mo-flag:${x[0]}:list" role="switch" aria-checked="${!!b[x[0]]}" aria-label="${x[1]}"></button></div>`).join('')}</div>
      <h3>Так это будет выглядеть</h3>${briefCards(s, 'in-sheet') || `<div class="ap-card mo-none">${si('sliders', 24)}<span>Ничего не выбрано — после подъёма будет только итог утра</span></div>`}</div>`, 'ap-sheet');
    K.setTop(flow, top);
  }

  /* Подарки за серию — новые пейзажи для открыток. Открываются по лучшей серии и остаются навсегда. */
  function giftsSheet(flow) {
    const s = flow.state, st = K.stats(s), rw = rewards(s), nx = rw.find((r) => !r.open), left = nx ? Math.max(1, nx.n - st.streak) : 0, top = K.keepTop(flow);
    const max = REWARDS[REWARDS.length - 1][0], cur = Math.min(st.streak, max);
    const hero = nx
      ? `<div class="gf-prev">${sample(nx.id, 1)}<i class="gf-lock">${si('lock', 16)}</i></div><div class="gf-txt"><small>Следующий пейзаж</small><b>«${nx.name}»</b><span>через ${left} ${utr(left)} подряд</span><em>${st.streak ? `серия сейчас ${st.streak}${st.best > st.streak ? `, рекорд ${st.best}` : ''}` : 'серия начнётся с первого подъёма'}</em></div>`
      : `<div class="gf-prev">${sample('aurora', 1)}</div><div class="gf-txt"><small>Серия ${st.best} ${utr(st.best)}</small><b>Все пейзажи твои</b><span>Они уже появляются на открытках</span></div>`;
    flow.sheet(`${head('Подарки за серию')}<div class="ap-sh-body scroll">
      <div class="ap-card gf-hero">${hero}</div>
      <div class="gf-path" aria-hidden="true"><i class="gf-line"><u style="width:${((cur / max) * 100).toFixed(1)}%"></u></i>${rw.map((r) => `<span class="${r.open ? 'on' : ''}${nx && r.n === nx.n ? ' next' : ''}" style="left:${((r.n / max) * 100).toFixed(1)}%"><i>${r.open ? si('check', 13) : ''}</i><b>${r.n}</b></span>`).join('')}</div>
      <h3>Пейзажи для открыток</h3>
      <div class="gf-grid">${SCENES.map((sc, i) => { const open = sc[2] <= st.best; return `<div class="gf-scene${open ? ' open' : ''}${Sonly.news && Sonly.news.showing('l', sc[0]) ? ' is-new' : ''}">${sample(sc[0], i)}${open ? '' : `<i class="gf-lock">${si('lock', 14)}</i>`}<b>${short(sc)}</b><small>${!sc[2] ? 'есть сразу' : open ? `открыт · ${sc[2]} ${utr(sc[2])}` : `${sc[2]} ${utr(sc[2])} подряд`}</small></div>`; }).join('')}</div>
      <p class="mo-fine">${nb('Каждое утро открытка берёт один из открытых пейзажей, а в день, когда серия открыла новый, — его. Подарок остаётся навсегда, даже если серия прервётся.')}</p></div>`, 'ap-sheet');
    K.setTop(flow, top);
  }

  function albumSheet(flow, enter = '') {
    const s = flow.state, h = K.stats(s).h, wakes = h.map((x) => x.wake).sort((a, b) => a - b);
    let body;
    if (!h.length) {
      body = `<div class="mo-empty"><span class="mo-stack big">${['sea', 'city', 'mountains'].map((l, i) => sample(l, i)).join('')}</span>
        <b>${nb('Первая открытка — завтра утром')}</b><p>${nb('После каждого подъёма здесь появляется открытка: небо — время подъёма, пейзаж открывает серия.')}</p></div>`;
    } else {
      const groups = [], rec = records(h), best = bestByDay(s, h);
      h.slice().reverse().forEach((x) => {
        const key = cap(x.d.toLocaleDateString('ru-RU', x.d.getFullYear() === new Date().getFullYear() ? { month: 'long' } : { month: 'long', year: 'numeric' }));
        (groups.find((g) => g[0] === key) || groups[groups.push([key, []]) - 1])[1].push(x);
      });
      /* Шкала внизу — не легенда, а твои утра: точка на каждый подъём поверх тех же цветов неба, что на открытках. */
      const med = wakes[Math.floor(wakes.length / 2)], at = (m) => Math.max(0, Math.min(100, ((m - 240) / 360) * 100)).toFixed(1);
      const bar = SKY.map(([m, a, b]) => `${rgb(mixc(a, b, 0.4))} ${at(m)}%`).join(',');
      body = `<div class="ap-card mo-sum"><span><b>${h.length}</b><small>${K.pl(h.length, 'открытка', 'открытки', 'открыток')}</small></span><span><b>${K.fmtMin(wakes[0])}</b><small>самое раннее</small></span><span><b>${K.fmtMin(wakes[Math.floor(wakes.length / 2)])}</b><small>обычно</small></span></div>
        ${groups.map(([name, list]) => `<h3 class="mo-month">${name}<span>${list.length}</span></h3><div class="mo-album">${list.map((x) => cardOf(x, { best: best.get(x.d.getTime()), rec, nw: !!(Sonly.news && Sonly.news.showing('c', x.d.getTime())) })).join('')}</div>`).join('')}
        <div class="ap-card mo-when"><header><b>Во сколько ты встаёшь</b><small>небо открыток — по этим часам</small></header>
          <div class="mo-bar" style="background:linear-gradient(90deg,${bar})">${h.map((x) => `<u style="--x:${at(x.wake)}%"></u>`).join('')}<em style="--x:${at(med)}%"></em><b class="mo-med${at(med) < 14 ? ' l' : at(med) > 86 ? ' r' : ''}" style="--x:${at(med)}%">обычно ${K.fmtMin(med)}</b></div>
          <span class="mo-ticks"><small>04:00</small><small>06:00</small><small>08:00</small><small>10:00</small></span></div>
        <div class="mo-legend"><span><b>${si('rise', 12)}</b>самый ранний подъём</span><span><b>${ic('zap', 11, 2.6)}</b>быстрее всего задание</span></div>`;
    }
    /* Открыт из профиля — стрелка ведёт назад в профиль, а не закрывает всё до экрана под ним. */
    if (flow.sheets.querySelector('[data-pp="profile"]')) s._albumFrom = 'profile';
    const fromPP = s._albumFrom === 'profile';
    flow.sheet(`${fromPP ? head('Открытки утра', 'mo-album-pp', 'back') : head('Открытки утра')}<div class="ap-sh-body scroll">${body}</div>`, `ap-sheet${enter ? ' ' + enter : ''}`);
  }

  /** Открытка крупно: что было этим утром, листать соседние, сохранить и отправить. */
  function cardSheet(flow, t, enter = 'push') {
    const s = flow.state, h = K.stats(s).h, i = h.findIndex((x) => x.d.getTime() === +t), x = h[i];
    if (!x) { albumSheet(flow, 'back'); return; }
    const best = bestByDay(s, h), land = landOf(x, best.get(x.d.getTime())), sc = sceneOf(land), tk = x.task && TASKS.find((y) => y.id === x.task), f = findOf(x, land, tone(x, land));
    const wakes = h.map((y) => y.wake).sort((a, b) => a - b), med = wakes[Math.floor(wakes.length / 2)], dw = x.wake - med;
    const vs = !dw ? 'как обычно' : `на ${Math.abs(dw)} мин ${dw < 0 ? 'раньше' : 'позже'} обычного`;
    const nav = (j, dir) => (h[j] ? `<button class="mo-nav ${dir}" data-act="mo-card:${h[j].d.getTime()}:${dir}" aria-label="${dir === 'prev' ? 'Предыдущая' : 'Следующая'} открытка">${ic(dir === 'prev' ? 'chevron-left' : 'chevron-right', 22, 2.4)}</button>` : `<span class="mo-nav ${dir} off"></span>`);
    flow.sheet(`${head(cap(x.d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })), 'mo-album-back', 'back')}<div class="ap-sh-body scroll">
      <div class="mo-big-card">${nav(i - 1, 'prev')}${cardOf(x, { tag: 'div', land, rec: records(h), sizes: '250px' })}${nav(i + 1, 'next')}</div>
      <div class="ap-card ap-list">
        <div class="ap-row tall"><i class="ap-row-i c" style="--c:#FF9500">${si('rise', 20)}</i><span>Подъём в ${K.fmtMin(x.wake)}<small>${vs}</small></span></div>
        ${tk ? `<div class="ap-row tall"><i class="ap-row-i c tb cat-${tk.cat}">${Sonly.ti(tk.id, 19)}</i><span>${tk.name}<small>${x.secs ? `выполнено за ${x.secs} с` : 'выполнено'}</small></span></div>` : ''}
        <div class="ap-row tall"><i class="ap-row-i c" style="--c:#AF52DE">${si('cards', 20)}</i><span>Пейзаж «${sc[1]}»<small>${sc[2] ? `открыт за ${sc[2]} ${utr(sc[2])} подряд` : 'есть сразу'} · № ${i + 1} из ${h.length}</small></span></div>${f && f.lvl ? `<div class="ap-row tall"><i class="ap-row-i c" style="--c:#FFB020">${ic('sparkles', 19, 2.3)}</i><span>${f.name}<small>${findNote(f)}</small></span></div>` : ''}</div>
      <p class="ap-note mo-msg">${s._copied || ''}</p></div>
      <div class="ap-sh-foot mo-two"><button class="ap-btn ghost" data-act="mo-save:${t}">${si('save', 19)}Сохранить</button><button class="ap-btn" data-act="mo-share:${t}">${si('share', 19)}Поделиться</button></div>`, `ap-sheet ${enter}`);
  }

  /* ── Верх экрана «Доброе утро» ───────────────────────────── */

  const hm = (v) => { const [a, b] = String(v || '0:0').split(':'); return (+a || 0) * 60 + (+b || 0); };
  /* Когда ничего особенного: тёплая фраза дня — каждый день своя. */
  const GREET = [
    ['Утро уже твоё', 'Первое дело дня сделано — дальше легче'],
    ['Ты встал — это главное', 'Самое трудное за сегодня уже позади'],
    ['Хорошее начало', 'Стакан воды и свет из окна — и ты в строю'],
    ['День начался с победы', 'Будильник выключен не кнопкой, а головой'],
    ['С добрым утром', 'Пусть день будет таким же ясным, как это утро'],
    ['Подъём засчитан', 'Открытка утра уже в альбоме'],
    ['Мозг проснулся', 'Задание позади — голова уже в работе'],
  ];
  /**
   * Новость утра — одна, самая яркая из правдивых: новый пейзаж, рекорд, редкая открытка, раньше обычного.
   * Если ничего такого — тёплая фраза дня. kind решает, как проснётся мозг.
   */
  function newsOf(s, r, x, o) {
    if (!o.mine) return r.direct ? { kind: 'try', h: 'Вот так ты проснёшься', p: 'Каждое утро мозг просыпается по-своему — и с новостью дня' } : { kind: 'try', h: 'Проверка пройдена', p: 'Утром мозг проснётся вместе с тобой' };
    const prev = o.h.filter((y) => y !== o.mine), goal = REWARDS.find(([n]) => n > o.best);
    if (o.fresh) return { kind: 'new', h: `Новый пейзаж — ${o.fresh[1]}`, p: goal ? `Его открыли ${o.fresh[2]} ${utr(o.fresh[2])} подряд. Следующий — ${sceneOf(goal[1])[1]}` : 'Открыты все пейзажи — теперь выпадает любой' };
    if (!prev.length) return { kind: 'first', h: 'Первое утро с sonly', p: 'Каждое утро — своя сценка, новость дня и открытка в альбом' };
    const early = Math.min(...prev.map((y) => y.wake)), fast = Math.min(...prev.map((y) => y.secs || 1e9));
    if (x.wake < early) return { kind: 'record', h: 'Самое раннее утро', p: `На ${early - x.wake} мин раньше прошлого рекорда` };
    if (x.secs && fast < 1e9 && x.secs < fast) return { kind: 'record', h: 'Рекорд скорости', p: `Задание за ${x.secs} с — быстрее, чем когда-либо` };
    if (o.f && o.f.lvl) return { kind: 'rare', h: o.f.lvl === 2 ? 'Очень редкая открытка' : 'Редкая открытка', p: `${o.f.name} — уже в альбоме. ${o.f.lvl === 2 ? 'Такая выпадает раз в месяц' : 'Такие — раз в одну-две недели'}` };
    /* Серии здесь нет: у неё свой экран сразу после этого. */
    const last = prev.slice(-14), usual = Math.round(last.reduce((a, y) => a + y.wake, 0) / last.length), dw = usual - x.wake;
    if (dw >= 5) return { kind: 'early', h: `На ${dw} мин раньше обычного`, p: 'Лишние минуты утра — тебе в подарок' };
    if (x.wake < 390) return { kind: 'early', h: 'Раньше солнца', p: 'Пока все спят, утро — только твоё' };
    const g = GREET[doy() % GREET.length];
    return { kind: 'greet', h: g[0], p: g[1] };
  }

  /*
   * Мозг просыпается — каждое утро по-своему. Сценки (анимации — в css/ring.css, .wb-<сценка>):
   * stretch — зевает и потягивается, wave — выезжает из-за края и машет «Привет!», dance — пританцовывает под ноты,
   * peek — выглядывает снизу и выпрыгивает, coffee — сонный с кружкой, от кофе распахивает глаза,
   * jump — прыгает от радости с конфетти (новый пейзаж, редкая открытка), flex — корона и мускулы (рекорд).
   * Обычное утро — по кругу день за днём, поэтому подряд одинаковых нет; проба — каждый раз случайная.
   */
  const WAKE = ['stretch', 'wave', 'dance', 'peek', 'coffee'];
  const SAY = ['Привет!', 'Доброе утро!', 'Я проснулся!', 'Погнали!', 'Новый день!'];
  const CONF = ['#FFC62B', '#FF6F93', '#4DABF7', '#69DB7C', '#9775FA', '#FFA94D'];
  let lastTry = '';
  function wakeScene(kind) {
    if (kind === 'record') return 'flex';
    if (kind === 'new' || kind === 'rare') return 'jump';
    if (kind === 'first') return 'wave';
    if (kind === 'try') { const all = WAKE.concat('jump', 'flex').filter((x) => x !== lastTry); lastTry = all[Math.floor(Math.random() * all.length)]; return lastTry; }
    return WAKE[doy() % WAKE.length];
  }
  /* Что вокруг мозга в сценке: буквы сна, облачко «Привет!», ноты, конфетти, искры. */
  function props(scene) {
    if (scene === 'stretch') return '<span class="wb-z"><b>z</b><b>z</b><b>z</b></span>';
    if (scene === 'wave') return `<b class="wb-say">${SAY[doy() % SAY.length]}</b>`;
    if (scene === 'dance') return `<span class="wb-notes">${['music', 'music-2', 'music-4'].map((n, i) => `<i class="n${i + 1}">${ic(n, 18 + i * 3, 2.4)}</i>`).join('')}</span>`;
    const sp = '<span class="wb-sp"><i class="s1"></i><i class="s2"></i><i class="s3"></i><i class="s4"></i></span>';
    if (scene === 'peek' || scene === 'coffee') return sp;
    return sp + `<span class="wb-conf">${Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * Math.PI * 2, d = 96 + (i % 3) * 26; return `<i style="--x:${Math.round(Math.cos(a) * d)}px;--y:${Math.round(Math.sin(a) * d * 0.75 - 40)}px;--r:${(i * 53) % 360}deg;--c:${CONF[i % CONF.length]};--d:${(i % 5) * 45}ms"></i>`; }).join('')}</span>`;
  }
  /* Кружка в руке (coffee) и корона (flex) — прямо в рисунке мозга, чтобы двигались вместе с ним. */
  const MUG = '<g class="wb-mug"><path class="wb-steam s1" d="M186 126q-4-5 0-10t0-10"/><path class="wb-steam s2" d="M195 124q-4-5 0-10t0-10"/><path class="wb-handle" d="M199 140q9 0 9 8t-9 8"/><rect class="wb-cup" x="177" y="133" width="23" height="27" rx="6"/><rect class="wb-cof" x="180" y="136" width="17" height="4.5" rx="2.2"/></g>';
  const CROWN = '<g class="wb-crown"><path d="M89 24L92 2l10 11 8-13 8 13 10-11 3 22z"/><circle cx="92" cy="2" r="3.4"/><circle cx="110" cy="0" r="3.8"/><circle cx="128" cy="2" r="3.4"/></g>';
  /**
   * Логотип по частям для экрана подъёма: те же контуры, что в Sonly.logo(), но «s» и «nly» — в своих окнах, чтобы выезжать
   * из-за солнца в разные стороны, и свечение за солнцем. Где граница окон и свечение — меряет экран подъёма (ring.js).
   */
  function logoParts() {
    const src = Sonly.logo(), ds = [...src.matchAll(/<path fill="([^"]+)" d="([^"]+)"/g)];
    if (ds.length < 2) return src;
    const word = ds[0][2], sunFill = ds[1][1], sun = ds[1][2];
    return `<svg class="logo wk-lg" viewBox="0 0 1748 620" role="img" aria-label="sonly"><defs><clipPath id="wkLl"><rect class="js-lcl" x="-200" y="-200" width="1070" height="1020"/></clipPath><clipPath id="wkLr"><rect class="js-lcr" x="870" y="-200" width="1200" height="1020"/></clipPath>
      <radialGradient id="wkLg"><stop offset="0" stop-color="#FFD24A" stop-opacity=".75"/><stop offset=".5" stop-color="#FFC21A" stop-opacity=".25"/><stop offset="1" stop-color="#FFC21A" stop-opacity="0"/></radialGradient></defs>
      <circle class="lg-glow js-lgl" cx="870" cy="300" r="380" fill="url(#wkLg)"/>
      <g clip-path="url(#wkLl)"><g class="lg-l"><path fill="currentColor" d="${word}"/></g></g>
      <g clip-path="url(#wkLr)"><g class="lg-r"><path fill="currentColor" d="${word}"/></g></g>
      <path class="lg-sun js-lsun" fill="${sunFill}" d="${sun}"/></svg>`;
  }
  function brainOf(scene) {
    let svg = Sonly.brain ? Sonly.brain('wkb') : '';
    const extra = scene === 'coffee' ? MUG : scene === 'flex' ? CROWN : '', at = svg.lastIndexOf('</g></svg>');
    if (extra && at > 0) svg = svg.slice(0, at) + extra + svg.slice(at);
    return svg;
  }
  /**
   * Верх экрана «Доброе утро»: логотип (появляется, когда солнце с экрана задания долетит до него), мозг, который
   * просыпается своей сценкой, новость утра, подъём и погода. Проба и проверка — та же сценка, но в историю утро не идёт.
   */
  function hero(s, r) {
    syncWx(s);
    const st = K.stats(s), h = st.h, day = K.day0(new Date()).getTime();
    const mine = !r.test && h.find((y) => y.d.getTime() === day);
    const x = mine || { d: new Date(day), wake: hm(r.at), secs: r.secs };
    const by = bestByDay(s, h), best = (mine && by.get(day)) || st.best || 0;
    const before = Math.max(0, ...[...by.entries()].filter(([t]) => t < day).map(([, v]) => v));
    const land = landOf(x, best), f = findOf(x, land, tone(x, land));
    const fresh = mine && SCENES.find((sc) => sc[2] && sc[2] > before && sc[2] <= best);
    /* s._wkScene — только для снимков и проверок: показать нужную сценку. */
    const nw = newsOf(s, r, x, { mine, fresh, f, best, h }), scene = s._wkScene || wakeScene(nw.kind);
    /* Размер заголовка — по самому длинному куску, который не переносится (склеенные слова): он должен влезть в строку. */
    const seg = Math.max(...nb(nw.h).split(' ').map((w) => w.length)), hcls = seg > 15 ? 'l' : '';
    const date = cap(new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }));
    /* Две плитки одного устройства: значок и примета справа, крупная цифра, подпись. Погода открывает истории утра. */
    const tile = (cls, icon, side, val, label, act) => `<${act ? `button type="button" data-act="${act}"` : 'div'} class="ws ${cls}"><header><i class="ws-ic">${icon}</i>${side}</header><b>${val}</b><small>${label}</small>${act ? '<span class="vh">Открыть истории утра</span>' : ''}</${act ? 'button' : 'div'}>`;
    const tiles = tile('sun', si('rise', 17), '', K.fmtMin(x.wake), x.secs ? `подъём за ${x.secs} с` : 'подъём')
      + tile('wx', si('weather', 18), `<em class="go">${ic('chevron-right', 16, 2.6)}</em>`, deg(W.now), `${W.text.toLowerCase()} · до ${deg(W.hi)}`, 'mo-story:weather');
    return `<header class="wk-top"><div><h1 class="wk-hi">Доброе утро</h1><small>${date}</small></div><div class="wk-logo js-wklogo">${logoParts()}</div></header>
      <div class="wk-hero">
        <div class="wk-news"><h2 class="${hcls}">${nb(nw.h).replace(/^(\d+) /, '$1\u00a0')}</h2><p>${nb(nw.p)}</p></div>
        <div class="wb wb-${scene}" data-scene="${scene}" aria-hidden="true"><i class="wb-glow"></i>${props(scene)}<i class="m-brain wb-br">${brainOf(scene)}</i></div>
      </div>
      <div class="wk-stats">${tiles}</div>${more(s)}`;
  }
  /* Под плитками — маленькие значки слова дня и поговорки (что включено в «После подъёма»): нажатие открывает историю. */
  function more(s) {
    const b = briefOf(s), list = BRIEF.filter((x) => x[0] !== 'weather' && b[x[0]]);
    return list.length ? `<div class="wk-more">${list.map(([id, name, glyph, c1, c2]) => `<button type="button" class="wk-mi" data-act="mo-story:${id}"><i style="--a:${c1};--b:${c2}">${si(glyph, 15)}</i>${name}</button>`).join('')}</div>` : '';
  }

  /*
   * Экран серии — сразу после «Доброе утро», как в Duolingo: огонь вспыхивает, число перещёлкивается со вчерашнего на
   * сегодняшнее, сегодняшний день недели заливается огнём с галочкой, конфетти. Анимации — в css/ring.css (.sk).
   * Проба и проверка в серию не идут: показывают, как будет утром, и честно это подписывают.
   */
  const SK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  /* Огонь в духе эмодзи Apple: три слоя — внешний красно-оранжевый, средний жёлтый, светлое ядро; каждый колышется сам. */
  const SK_FLAME = '<svg class="sk-flame" viewBox="0 0 120 160" aria-hidden="true"><defs>'
    + '<radialGradient id="skGo" cx="60" cy="120" r="100" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFB23C"/><stop offset=".5" stop-color="#FF6A1E"/><stop offset="1" stop-color="#E2321A"/></radialGradient>'
    + '<radialGradient id="skGm" cx="60" cy="128" r="72" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFE072"/><stop offset=".6" stop-color="#FFB12F"/><stop offset="1" stop-color="#FF8C1F"/></radialGradient>'
    + '<radialGradient id="skGc" cx="60" cy="136" r="46" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFFFF2"/><stop offset=".5" stop-color="#FFF2AE"/><stop offset="1" stop-color="#FFD957"/></radialGradient></defs>'
    + '<g class="sk-fo"><path fill="url(#skGo)" d="M60 155C32 155 13 135 13 108C13 84 22 66 27 46C33 58 37 65 43 70C42 48 52 32 60 20C63 14 64 9 63 3C74 16 84 30 87 50C88 55 88 59 87 63C92 58 95 52 97 44C104 58 107 82 107 104C107 134 88 155 60 155Z"/></g>'
    + '<g class="sk-fm"><path fill="url(#skGm)" d="M60 152C40 152 26 138 26 118C26 102 32 92 37 82C40 90 43 95 47 98C47 80 55 66 61 56C63 52 64 48 64 44C72 54 79 66 81 82C83 88 84 92 84 96C86 92 88 88 90 84C93 94 95 106 95 118C95 138 80 152 60 152Z"/></g>'
    + '<g class="sk-fc"><path fill="url(#skGc)" d="M60 150C48 150 40 141 40 129C40 117 47 106 53 98C56 94 58 90 59 86C64 94 72 106 76 116C79 122 80 126 80 130C80 142 72 150 60 150Z"/></g></svg>';
  function streakOf(s, r) {
    const st = K.stats(s), now = new Date(), day = K.day0(now).getTime(), done = new Set(st.h.map((y) => y.d.getTime()));
    /* Сегодня уже в истории — число серии его включает; нет (проба днём) — показываем, какой серия станет утром. */
    const to = done.has(day) ? Math.max(1, st.streak) : st.streak + 1, from = to - 1;
    const plan = (d) => s.alarms.some((a) => !a.once && a.days.includes((d.getDay() + 6) % 7));
    /* Число: меняются только те цифры, что другие (14 → 15 щёлкает одна, 19 → 20 — обе). */
    const a = String(from).padStart(String(to).length, ' ');
    const num = [...String(to)].map((n, i) => (a[i] === n ? `<span class="sk-d"><i>${n}</i></span>` : `<span class="sk-d roll"><span class="sk-r"><i>${a[i].trim()}</i><i>${n}</i></span></span>`)).join('');
    /* Под числом — одна строка: что открылось или сколько до следующего пейзажа. */
    const goal = REWARDS.find(([n]) => n > from), got = REWARDS.find(([n]) => n === to && st.best <= to);
    const msg = to === 1 ? [si('rise', 16), 'Серия началась — завтра будет 2']
      : got ? [si('gift', 16), `Новый пейзаж — «${sceneOf(got[1])[1]}»`]
        : goal ? [si('gift', 16), `До пейзажа «${sceneOf(goal[1])[1]}» — ${goal[0] - to} ${utr(goal[0] - to)}`]
          : [ic('sparkles', 15, 2.4), 'Все пейзажи открыты — серия просто растёт'];
    /* Неделя с понедельника: прошлые дни — огонь, если встал; сегодня заливается; линия соединяет дни подряд. */
    /* До первого подъёма с sonly дни не «пропущены» — их просто ещё не было. */
    const dow = (now.getDay() + 6) % 7, cells = [], first = st.h.length ? st.h[0].d.getTime() : day;
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow + i), t = d.getTime();
      const k = t === day ? 'now' : t > day ? 'next' : done.has(t) ? 'on' : t < first ? 'pre' : plan(d) ? 'miss' : 'rest';
      cells.push(k);
    }
    const week = cells.map((k, i) => `<div class="sk-day ${k}${k === 'on' && (cells[i + 1] === 'on' || cells[i + 1] === 'now') ? ` jr${cells[i + 1] === 'now' ? ' jn' : ''}` : ''}" style="--i:${i}"><small>${SK_DAYS[i]}</small><i class="sk-c">${k === 'on' || k === 'now' ? ic('check', 17, 3.4) : k === 'rest' ? '<u></u>' : ''}</i></div>`).join('');
    const conf = Array.from({ length: 26 }, (_, i) => { const g = (i / 26) * Math.PI * 2 + (i % 2) * 0.12, d = 110 + (i % 4) * 34; return `<i style="--x:${Math.round(Math.cos(g) * d)}px;--y:${Math.round(Math.sin(g) * d * 0.8)}px;--r:${(i * 67) % 360}deg;--c:${CONF[i % CONF.length]};--d:${(i % 6) * 30}ms"></i>`; }).join('');
    const emb = Array.from({ length: 9 }, (_, i) => `<i style="--x:${((i * 37) % 80) - 40}px;--s:${4 + (i % 3) * 2}px;--d:${(i * 0.37).toFixed(2)}s;--t:${(1.9 + (i % 4) * 0.35).toFixed(2)}s"></i>`).join('');
    const note = r.test ? 'Пробный подъём — серия не меняется' : '';
    const btn = r.from === 'picker' ? 'К заданиям' : r.from === 'editor' ? 'К будильнику' : 'Продолжить';
    return `<div class="sk" data-to="${to}">
      <div class="sk-stage"><i class="sk-glow"></i><i class="sk-ring"></i><span class="sk-emb">${emb}</span>${SK_FLAME}<span class="sk-conf">${conf}</span></div>
      <div class="sk-num" role="img" aria-label="${to}">${num}</div>
      <h1 class="sk-lbl">${K.pl(to, 'день', 'дня', 'дней')} подряд</h1>
      <p class="sk-msg">${msg[0]}<span>${nb(msg[1])}</span></p>
      <div class="sk-week" aria-label="Эта неделя">${week}</div>
      ${note ? `<p class="wk-note sk-note">${ic('info', 15, 2.3)}${note}</p>` : ''}
      <button class="ap-btn" data-act="ring-done">${btn}</button></div>`;
  }

  Sonly.morning = {
    rewards,
    /** Открытка утра (день — время полуночи этого дня) для объявления «Новая открытка»: картинка, находка в небе и её редкость. */
    cardInfo(s, day) {
      const h = K.stats(s).h, x = h.find((y) => y.d.getTime() === day);
      if (!x) return null;
      const best = bestByDay(s, h).get(day) || 0, land = landOf(x, best), f = findOf(x, land, tone(x, land));
      return { x, html: cardOf(x, { tag: 'div', best, sizes: '200px' }), find: f && f.lvl ? { name: f.name, lvl: f.lvl } : null };
    },
    /** Образец пейзажа (для объявления «Новый пейзаж»). */
    sample: (land) => sample(land, 1),
    /** Отметка «новое» на открытке в альбоме и на пейзаже в подарках. */
    isNew: (kind, id) => !!(Sonly.news && Sonly.news.showing(kind, id)),
    /** Экран «Доброе утро» (раскладка «Бенто»): приветствие и логотип, карточка мозга с новостью, плитки подъёма и погоды. */
    hero,
    /** Экран серии после «Доброе утро»: огонь, число со вчерашнего на сегодняшнее, неделя. */
    streak: streakOf,
    /** Небо для минуты суток — им же красится виджет следующего будильника. */
    sky: skyOf,
    /** Тихо обновить погоду, если место уже разрешено (раз в час). */
    refreshWx,
    /** Пейзажи открыток: [id, название, сколько утр подряд нужно]. Ими же можно украсить обложку профиля. */
    scenes: SCENES,
    /** Обложка профиля из пейзажа: то же небо, солнце и пейзаж, что на открытках, только широкой полосой. */
    banner(land) {
      const x = { d: new Date(2026, 0, 9), wake: land === 'aurora' ? 300 : 445 }, t = tone(x, land), k = t.k;
      /* Северное сияние — это небо: обложка показывает полосы сияния, остальные пейзажи — землю у горизонта. */
      const crop = land === 'aurora' ? 'viewBox="0 30 120 72" preserveAspectRatio="xMidYMid slice"' : 'viewBox="0 56 120 104" preserveAspectRatio="xMidYMax slice"';
      return `<span class="pp-ban-l" style="--a:${k.a};--b:${k.b}"><svg ${crop} aria-hidden="true">${sunSvg({ ...t, x: 84 })}${LAND[land](rnd(x.d.getTime() + 3), t)}</svg></span>`;
    },
    /** Сводка для экрана «Доброе утро». */
    blocks: (s) => briefCards(s, 'wk-brief'),
    preview(flow, what) {
      flow.go('morning', 0);
      if (what === 'album') albumSheet(flow); else if (what === 'gifts') giftsSheet(flow); else if (what === 'group' && Sonly.people) Sonly.people.together(flow);
      else if (what === 'brief') briefSheet(flow);
      else if (what === 'card') { const h = K.stats(flow.state).h; if (h.length) cardSheet(flow, h[h.length - 1].d.getTime()); else albumSheet(flow); }
      else if (what.startsWith('item') || what.startsWith('story')) story(flow, Math.max(0, BRIEF.findIndex((x) => x[0] === (what.split('-')[1] || 'weather'))));
    },
    on(flow, act, arg, el) {
      const s = flow.state;
      switch (act) {
        case 'mo-story': story(flow, Math.max(0, BRIEF.findIndex((x) => x[0] === arg))); return true;
        case 'sy-go': {
          const r = el && el.closest('.sy');
          if (r && r.dataset.held) { delete r.dataset.held; return true; }
          storyGo(flow, +arg);
          return true;
        }
        case 'sy-close': closeStory(flow); return true;
        case 'mo-geo': askWx(flow); return true;
        case 'mo-brief': briefSheet(flow); return true;
        case 'mo-flag': {
          const [id, from] = arg.split(':'), b = briefOf(s);
          b[id] = !b[id];
          if (from === 'story') { el.classList.toggle('on', b[id]); el.setAttribute('aria-checked', b[id]); if (flow.id === 'morning') flow.rerender(true); return true; }
          if (flow.id === 'morning') flow.rerender(true);
          briefSheet(flow);
          return true;
        }
        case 'mo-gifts': if (Sonly.news) Sonly.news.open(flow, 'l'); giftsSheet(flow); return true;
        case 'mo-album': s._albumFrom = ''; if (Sonly.news) Sonly.news.open(flow, 'c'); albumSheet(flow, flow.sheets.querySelector('[data-pp="profile"]') ? 'push' : ''); return true;
        case 'mo-album-pp': s._albumFrom = ''; return Sonly.people ? (Sonly.people.on(flow, 'pp-profile', 'back'), true) : false;
        case 'mo-album-back': s._copied = ''; albumSheet(flow, 'back'); return true;
        case 'mo-card': { const [t, dir] = arg.split(':'); s._copied = ''; cardSheet(flow, t, dir === 'prev' ? 'back' : 'push'); return true; }
        case 'mo-share': {
          const h = K.stats(s).h, i = h.findIndex((x) => x.d.getTime() === +arg), x = h[i];
          if (!x) return true;
          K.shareText(T('Встал в {time} — {date}. Открытка утра № {n} в sonly.', { time: K.fmtMin(x.wake), date: x.d.toLocaleDateString(LOC(), { weekday: 'long', day: 'numeric', month: 'long' }), n: i + 1 }), true, (msg) => { s._copied = msg.replace(' с кодом', ''); const n = flow.sheets.querySelector('.mo-msg'); if (n) n.textContent = s._copied; });
          return true;
        }
        case 'mo-save': {
          const h = K.stats(s).h, i = h.findIndex((x) => x.d.getTime() === +arg), x = h[i], msg = (t) => { const n = flow.sheets.querySelector('.mo-msg'); if (n) n.textContent = t; };
          if (!x) return true;
          cardPng(x, i + 1, bestByDay(s, h).get(x.d.getTime()), (url) => {
            if (!url) { msg('Не получилось собрать картинку'); return; }
            const a = document.createElement('a');
            a.href = url;
            /* Дата в имени — местная: toISOString дал бы вчерашний день (UTC) для утра до полуночи по Гринвичу. */
            a.download = `sonly-${x.d.getFullYear()}-${pad(x.d.getMonth() + 1)}-${pad(x.d.getDate())}.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            msg('Картинка сохранена');
          });
          return true;
        }
        default: return false;
      }
    },
  };
})();
