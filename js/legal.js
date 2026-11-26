/*
 * Юридические документы sonly: условия использования, политика конфиденциальности, условия партнёрской программы.
 * Тексты описывают то, что приложение делает на самом деле (что хранится на телефоне, что уходит в Apple/Google, что видят
 * друзья и партнёры). Русский и английский; на остальных языках интерфейса показывается английский текст.
 * Реквизиты владельца — в OWNER: до публикации заполнить и показать юристу.
 * Блок помечен data-i18n="off": движок перевода его не трогает.
 */
(() => {
  'use strict';
  const OWNER = {
    ru: { name: '[Название компании или ФИО предпринимателя]', addr: '[юридический адрес]', reg: '[регистрационный номер]', mail: '[почта поддержки]', law: '[страна]', court: '[город]' },
    en: { name: '[Company name or sole trader’s full name]', addr: '[registered address]', reg: '[registration number]', mail: '[support email]', law: '[country]', court: '[city]' },
  };
  /* Пока реквизиты не заполнены, они выделены в тексте пунктирной плашкой — сразу видно, что вписать. */
  const fill = (v) => (/^\[.*\]$/.test(v) ? `<span class="legal-fill">${v.slice(1, -1)}</span>` : v);
  const DATE = { ru: '25 ноября 2026 г.', en: '25 November 2026' };
  const TITLES = {
    terms: { ru: 'Условия использования', en: 'Terms of Use' },
    privacy: { ru: 'Политика конфиденциальности', en: 'Privacy Policy' },
    partner: { ru: 'Условия партнёрской программы', en: 'Partner Program Terms' },
  };
  const ul = (items) => `<ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul>`;

  /* ── Политика конфиденциальности ─────────────────────────── */
  const privacy = {
    ru: (o) => [
      ['Коротко', [
        'sonly — будильник, который выключается только заданием. Почти всё, что вы делаете в приложении, хранится и обрабатывается <b>на вашем телефоне</b>: будильники, история подъёмов, записи звуков, снимки для заданий.',
        'Мы не продаём данные, не показываем рекламу и не встраиваем рекламные трекеры. Камера и микрофон работают только во время задания и только с вашего разрешения; снимки и запись голоса для заданий разбираются на телефоне и никуда не отправляются.',
        'Ниже подробно: какие данные есть, зачем, у кого они бывают, сколько хранятся и как их удалить.',
      ]],
      ['1. Кто отвечает за данные', [
        `Оператор (контролёр) персональных данных — ${o.name}, ${o.addr}, ${o.reg} (далее — «мы»).`,
        `По любым вопросам о данных пишите на ${o.mail}. Мы отвечаем в течение 30 дней, обычно быстрее.`,
      ]],
      ['2. Какие данные и зачем', [
        '<b>Будильники и настройки</b> — время, дни, задание и его настройки, звук, громкость, тема, язык. Хранятся на телефоне. Нужны, чтобы будильник работал.',
        '<b>История подъёмов</b> — когда прозвенел будильник, когда решено задание, сколько секунд это заняло, серия, значки, открытки. Хранится на телефоне. Нужна для статистики, серии и наград.',
        '<b>Камера</b> (задания «Найди предмет», «Застели кровать», «Небо», «Таблетки», штрихкод и QR, приседания, отжимания, прыжки). Кадры разбирает модель ИИ прямо на телефоне. Снимки не сохраняются в галерею и не отправляются нам или кому-то ещё. Модели ИИ скачиваются с нашего сайта один раз и дальше работают без сети.',
        '<b>Микрофон</b> (задания со скороговоркой и фразой, запись своего звука). Свой звук сохраняется только на телефоне. Речь распознаёт система телефона или браузер: на большинстве телефонов — на самом устройстве; в некоторых браузерах (например, Chrome) звук может отправляться для распознавания на серверы разработчика браузера по его правилам. Мы записи голоса не получаем.',
        '<b>Датчики движения</b> (задания «Шаги» и «Встряхни»). Обрабатываются на телефоне, не сохраняются.',
        '<b>Музыка из каталога Apple.</b> Когда вы ищете песню, текст запроса уходит в открытый поиск Apple (iTunes Search), а отрывок песни скачивается с серверов Apple. Это регулируется политикой конфиденциальности Apple. Выбранный кусок песни хранится на телефоне.',
        '<b>Свои файлы со звуком.</b> Файл, который вы выбрали, разбирается и хранится на телефоне. Нам он не передаётся.',
        '<b>Профиль</b> (имя, «о себе», аватар — буква, мозг или фото). Хранится на телефоне; если вы пользуетесь друзьями, имя, аватар и код профиля видят добавленные вами друзья.',
        '<b>Друзья.</b> Если вы добавляете друзей, мы храним на сервере ваш код профиля, список друзей и статус утра: проснулись ли вы, во сколько будильник и опоздали ли. Это видят только ваши друзья. Статус можно скрыть в настройках, друзей — удалить.',
        '<b>Покупки.</b> Оплата проходит через App Store или Google Play. Данные карты мы не получаем: магазин сообщает нам только, какая подписка активна, когда она продлевается и был ли возврат. Если покупка сделана по промокоду, мы связываем её с кодом, чтобы начислить долю партнёру.',
        '<b>Промокоды.</b> Введённый код хранится вместе с покупкой. Партнёр видит по своему коду только обезличенные покупки: дату, тариф и статус. Ваше имя и почту он не видит.',
        '<b>Партнёрская программа.</b> Если вы партнёр: код, начисления, способ и реквизиты выплаты (карта, IBAN или PayPal), данные для налогов, если их требует закон. Реквизиты обрабатывает платёжный сервис, через который идут выплаты.',
        '<b>Сообщения в поддержку.</b> Текст, ваш адрес для ответа и, если вы не выключили «Приложить журнал», технический журнал: версия приложения, модель телефона, системные ошибки. В журнале нет снимков, звука и содержимого будильников.',
        '<b>Уведомления.</b> Чтобы будильник и проверка подъёма работали, приложение просит разрешение на уведомления. Токен уведомлений обрабатывают Apple или Google.',
        '<b>Технические данные.</b> Серверы сайта и магазины приложений обычно записывают IP-адрес, тип устройства и время запроса в журналы безопасности. Мы используем их только для защиты от злоупотреблений и исправления ошибок.',
      ]],
      ['3. Основания обработки', [
        'Мы обрабатываем данные, когда это нужно для работы приложения и подписки по договору с вами (Условия использования); с вашего согласия — для камеры, микрофона, уведомлений, друзей; когда этого требует закон — учёт платежей и налогов; и в наших законных интересах — безопасность, защита от мошенничества, исправление ошибок. Согласие можно отозвать в любой момент в настройках телефона или приложения.',
      ]],
      ['4. Кому мы передаём данные', [
        'Только тем, без кого приложение не работает, и только нужное им:',
        ul(['Apple и Google — покупки, подписки, уведомления, распознавание речи системой;',
          'Apple (iTunes Search) — поисковые запросы и отрывки песен;',
          'хостинг и серверы — хранение данных друзей и партнёрской программы;',
          'платёжный сервис выплат — реквизиты и суммы выплат партнёрам;',
          'государственные органы — только по законному требованию.']),
        'Мы не продаём и не сдаём данные, не передаём их рекламным сетям и брокерам данных.',
      ]],
      ['5. Передача в другие страны', [
        'Некоторые сервисы (Apple, Google, хостинг) могут обрабатывать данные за пределами вашей страны, в том числе вне ЕС. В таких случаях мы опираемся на решения об адекватности или стандартные договорные условия Европейской комиссии и аналогичные механизмы.',
      ]],
      ['6. Сколько хранятся данные', [
        ul(['данные на телефоне — пока вы не удалите их в приложении или не удалите приложение;',
          'данные друзей на сервере — пока у вас есть профиль; после удаления профиля — до 30 дней в резервных копиях;',
          'данные о покупках и выплатах — столько, сколько требует налоговое и бухгалтерское законодательство (обычно 5–10 лет);',
          'обращения в поддержку — до 2 лет после последнего сообщения;',
          'журналы безопасности — до 90 дней.']),
      ]],
      ['7. Ваши права', [
        'Вы можете: узнать, какие данные о вас у нас есть, и получить копию; исправить их; удалить; ограничить обработку или возразить против неё; забрать данные в машиночитаемом виде; отозвать согласие. Для этого напишите на ' + o.mail + '. Мы можем попросить подтвердить, что запрос пришёл от вас.',
        'Удалить всё с телефона можно в приложении («Настройки → Сбросить») или удалив приложение. Профиль у друзей и данные на сервере удаляются по запросу или в настройках профиля.',
        'Если вы считаете, что мы нарушаем ваши права, вы можете пожаловаться в надзорный орган по защите данных своей страны (в ЕС — орган вашей страны проживания; в Польше — UODO; в Украине — Уполномоченный Верховной Рады по правам человека).',
      ]],
      ['8. Дети', [
        'sonly не предназначен для детей младше 13 лет. В странах, где для согласия на обработку данных нужен больший возраст (в ЕС — до 16 лет), ребёнок может пользоваться приложением только с согласия родителей. Если вы узнали, что ребёнок передал нам данные без такого согласия, напишите нам — мы их удалим.',
      ]],
      ['9. Безопасность', [
        'Данные на сервере передаются по зашифрованному соединению, доступ к ним есть только у тех, кому он нужен для работы. Данные на телефоне защищены его блокировкой и шифрованием системы. Ни одна система не защищена полностью, поэтому мы храним как можно меньше.',
      ]],
      ['10. Изменения', [
        'Если мы изменим политику, новая версия появится в приложении и на сайте с новой датой. О существенных изменениях мы предупредим заранее в приложении.',
      ]],
    ],
    en: (o) => [
      ['In short', [
        'sonly is an alarm clock that only turns off once you complete a task. Almost everything you do in the app is stored and processed <b>on your phone</b>: alarms, wake-up history, sound recordings, photos for tasks.',
        'We don’t sell data, don’t show ads and don’t include advertising trackers. The camera and microphone work only during a task and only with your permission; photos and voice for tasks are analysed on the phone and are not sent anywhere.',
        'Below in detail: what data exists, why, who gets it, how long it is kept and how to delete it.',
      ]],
      ['1. Who is responsible', [
        `The controller of personal data is ${o.name}, ${o.addr}, ${o.reg} (“we”).`,
        `For any question about your data write to ${o.mail}. We reply within 30 days, usually sooner.`,
      ]],
      ['2. What data and why', [
        '<b>Alarms and settings</b> — time, days, task and its settings, sound, volume, theme, language. Stored on the phone. Needed for the alarm to work.',
        '<b>Wake-up history</b> — when the alarm rang, when the task was solved, how many seconds it took, streak, badges, postcards. Stored on the phone. Needed for statistics, streaks and rewards.',
        '<b>Camera</b> (tasks “Find an object”, “Make the bed”, “Sky”, “Pills”, barcode and QR, squats, push-ups, jumps). Frames are analysed by an AI model right on the phone. Photos are not saved to your gallery and are not sent to us or anyone else. AI models are downloaded from our website once and then work offline.',
        '<b>Microphone</b> (tongue-twister and phrase tasks, recording your own sound). Your own sound is stored only on the phone. Speech is recognised by the phone’s system or the browser: on most phones on the device itself; some browsers (for example, Chrome) may send audio to the browser vendor’s servers for recognition under its rules. We don’t receive voice recordings.',
        '<b>Motion sensors</b> (“Steps” and “Shake” tasks). Processed on the phone, not stored.',
        '<b>Music from the Apple catalog.</b> When you search for a song, the query is sent to Apple’s public search (iTunes Search) and the song preview is downloaded from Apple’s servers. Apple’s privacy policy applies. The chosen part of the song is stored on the phone.',
        '<b>Your own sound files.</b> The file you choose is analysed and stored on the phone. It is not sent to us.',
        '<b>Profile</b> (name, bio, avatar — letter, brain or photo). Stored on the phone; if you use Friends, your name, avatar and profile code are visible to the friends you add.',
        '<b>Friends.</b> If you add friends, we store on our server your profile code, your friends list and your morning status: whether you woke up, your alarm time and whether you were late. Only your friends see it. You can hide your status in settings and remove friends.',
        '<b>Purchases.</b> Payment goes through the App Store or Google Play. We never receive card details: the store only tells us which subscription is active, when it renews and whether it was refunded. If the purchase used a promo code, we link it to that code to credit the partner.',
        '<b>Promo codes.</b> The entered code is stored with the purchase. A partner sees only anonymised purchases for their code: date, plan and status. They don’t see your name or email.',
        '<b>Partner program.</b> If you are a partner: your code, earnings, payout method and details (card, IBAN or PayPal) and tax data where the law requires it. Payout details are processed by the payment service used for payouts.',
        '<b>Support messages.</b> The text, your reply address and, unless you turn off “Attach log”, a technical log: app version, phone model, system errors. The log contains no photos, sound or alarm contents.',
        '<b>Notifications.</b> For alarms and the wake-up check to work, the app asks for notification permission. Notification tokens are processed by Apple or Google.',
        '<b>Technical data.</b> Website servers and app stores usually record IP address, device type and time of request in security logs. We use them only to prevent abuse and fix errors.',
      ]],
      ['3. Legal bases', [
        'We process data when it is necessary to provide the app and subscription under our contract with you (Terms of Use); with your consent — for camera, microphone, notifications and Friends; when the law requires it — payment and tax records; and for our legitimate interests — security, fraud prevention, fixing errors. You can withdraw consent at any time in the phone or app settings.',
      ]],
      ['4. Who we share data with', [
        'Only with those without whom the app can’t work, and only what they need:',
        ul(['Apple and Google — purchases, subscriptions, notifications, system speech recognition;',
          'Apple (iTunes Search) — search queries and song previews;',
          'hosting and servers — storing Friends and partner program data;',
          'the payout service — partners’ payout details and amounts;',
          'public authorities — only when legally required.']),
        'We don’t sell or rent data and don’t share it with ad networks or data brokers.',
      ]],
      ['5. International transfers', [
        'Some services (Apple, Google, hosting) may process data outside your country, including outside the EU. In such cases we rely on adequacy decisions, the European Commission’s Standard Contractual Clauses or equivalent mechanisms.',
      ]],
      ['6. How long we keep data', [
        ul(['data on the phone — until you delete it in the app or delete the app;',
          'Friends data on the server — while you have a profile; after deletion up to 30 days in backups;',
          'purchase and payout records — as long as tax and accounting laws require (usually 5–10 years);',
          'support requests — up to 2 years after the last message;',
          'security logs — up to 90 days.']),
      ]],
      ['7. Your rights', [
        'You can: find out what data we hold about you and get a copy; correct it; delete it; restrict or object to processing; take your data in a machine-readable format; withdraw consent. To do so, write to ' + o.mail + '. We may ask you to confirm the request comes from you.',
        'You can delete everything on the phone in the app (“Settings → Reset”) or by deleting the app. Your profile with friends and server data are deleted on request or in profile settings.',
        'If you believe we are breaching your rights, you can complain to the data protection authority of your country (in the EU — the authority where you live; in Poland — UODO; in Ukraine — the Parliament Commissioner for Human Rights).',
      ]],
      ['8. Children', [
        'sonly is not intended for children under 13. In countries where a higher age is required to consent to data processing (in the EU up to 16), a child may use the app only with parental consent. If you learn that a child gave us data without such consent, write to us and we will delete it.',
      ]],
      ['9. Security', [
        'Server data travels over encrypted connections, and only those who need it for their work can access it. Data on the phone is protected by its lock screen and system encryption. No system is fully secure, so we keep as little as possible.',
      ]],
      ['10. Changes', [
        'If we change this policy, the new version will appear in the app and on the website with a new date. We will warn you in advance in the app about material changes.',
      ]],
    ],
  };

  /* ── Условия использования ───────────────────────────────── */
  const terms = {
    ru: (o) => [
      ['1. О чём эти условия', [
        `Это договор между вами и ${o.name} (${o.addr}, ${o.reg}; далее — «мы») об использовании приложения и сайта sonly (далее — «sonly»). Устанавливая или используя sonly, вы соглашаетесь с этими условиями и Политикой конфиденциальности. Если не согласны — не пользуйтесь sonly.`,
        'Если вы покупаете подписку через App Store или Google Play, к покупке также применяются правила магазина. Ваши права потребителя по закону вашей страны эти условия не ограничивают.',
      ]],
      ['2. Что такое sonly', [
        'sonly — будильник, который нельзя отложить и выключить, пока вы не выполните задание: решить примеры, найти предмет, сделать приседания, сказать фразу и другие. Ещё в sonly есть статистика подъёмов, серия, значки, открытки, друзья, свои звуки, проверка подъёма и партнёрская программа.',
        'Проверка подъёма: если она включена, через выбранное время после задания sonly спросит «Ты не спишь?». Если не ответить за минуту, будильник зазвонит снова. Её можно выключить в настройках будильника.',
      ]],
      ['3. Кто может пользоваться', [
        'Вам должно быть не меньше 13 лет. Если в вашей стране для таких договоров нужен больший возраст, вы подтверждаете, что у вас есть согласие родителей или законного представителя. Покупки и партнёрская программа — только для дееспособных лиц от 18 лет или с согласия родителей, где это допускает закон.',
      ]],
      ['4. Надёжность будильника — важно', [
        '!!Мы делаем всё, чтобы будильник звонил вовремя. Но звонок зависит и от вашего телефона: заряда, режима энергосбережения, «Не беспокоить», громкости, разрешений, обновлений системы, настроек производителя. Проверьте звонок кнопкой «Проверить звонок» и экраном «Готовность к звонку».',
        'Для событий, которые нельзя пропустить (рейс, экзамен, лекарства по времени), поставьте запасной будильник. Мы не отвечаем за последствия несработавшего или запоздавшего звонка, если причина — в телефоне, его настройках или системе, а не в нашей ошибке, и в пределах, допускаемых законом.',
      ]],
      ['5. Здоровье и безопасность', [
        '!!Физические задания (приседания, отжимания, прыжки, шаги, встряхивание) — лёгкая нагрузка, но выполняйте их только если это вам не противопоказано. При боли, головокружении или недомогании остановитесь. Если у вас есть заболевания сердца, суставов или беременность — посоветуйтесь с врачом и выберите другое задание.',
        'Не выполняйте задания там, где это опасно: за рулём, на лестнице, у края, на скользком полу. Не снимайте других людей без их согласия.',
        'Задание «Таблетки» — только напоминание. sonly не даёт медицинских советов, не следит за приёмом лекарств и не заменяет врача. sonly не лечит нарушения сна.',
      ]],
      ['6. Подписка и оплата', [
        '!iЧасть функций доступна по подписке: на месяц (6,99 €) или на год (39,99 €). Цены в вашей стране могут отличаться и указаны в магазине перед покупкой, включая налоги.',
        ul(['оплата списывается с аккаунта App Store или Google Play при подтверждении покупки;',
          '<b>подписка продлевается автоматически</b> на тот же срок, если не отключить продление не позднее чем за 24 часа до конца периода;',
          'отключить продление можно в настройках аккаунта магазина; удаление приложения подписку не отменяет;',
          'пробный период (3 дня) даётся только по промокоду; если не отменить подписку до конца пробного периода, начнётся платный период;',
          'скидка по промокоду или предложению (−25 % на первый год) действует только на первый год, дальше — обычная цена;',
          'возвраты — по правилам Apple или Google; в ЕС вы соглашаетесь на немедленный доступ к цифровому содержимому и признаёте, что после начала использования право на отказ в 14 дней может быть утрачено в пределах, допускаемых законом;',
          'о повышении цены мы предупредим заранее, как этого требуют правила магазина и закон.']),
      ]],
      ['7. Промокоды', [
        'Промокод даёт пробный период и скидку на первый год, если он действует. Один промокод — одна покупка на аккаунт магазина. Промокоды не обмениваются на деньги, могут иметь срок и могут быть отключены при злоупотреблении.',
      ]],
      ['8. Ваш контент', [
        'Свои звуки, имя, «о себе», аватар и фото принадлежат вам. Вы подтверждаете, что у вас есть права на файлы, которые вы добавляете (например, песни со своего телефона), и используете их только для себя. Чтобы показать ваше имя, аватар и статус друзьям, вы даёте нам бесплатное неисключительное разрешение хранить и показывать их только для работы sonly.',
        'Нельзя использовать имя, аватар или код, которые оскорбляют, нарушают закон или чужие права, выдают вас за другого человека или sonly.',
      ]],
      ['9. Отрывки музыки', [
        'Отрывки песен приходят из открытого каталога Apple и предназначены только для личного использования как звук будильника в sonly. Права на музыку принадлежат её правообладателям.',
      ]],
      ['10. Что запрещено', [
        ul(['взламывать, разбирать или изменять sonly, обходить подписку или защиту;',
          'создавать нагрузку на серверы, автоматически собирать данные, рассылать спам через друзей;',
          'выдавать себя за другого, преследовать или оскорблять других пользователей;',
          'использовать sonly с нарушением закона.']),
        'При нарушении мы можем ограничить доступ к функциям, связанным с сервером (друзья, партнёрская программа), или удалить профиль. Оплаченная подписка при этом регулируется правилами магазина.',
      ]],
      ['11. Интеллектуальная собственность', [
        'sonly, его дизайн, тексты, задания, иллюстрации, логотип и персонажи принадлежат нам или используются по лицензии. Вы получаете личное, неисключительное, непередаваемое право пользоваться sonly на своих устройствах. Звуки будильника — записи под лицензией CC0 (список авторов — в «Настройки → Звуки и авторы»).',
      ]],
      ['12. Изменения и доступность', [
        'Мы улучшаем sonly: добавляем, меняем и иногда убираем функции. Мы стараемся, чтобы sonly работал всегда, но не обещаем, что без перерывов и ошибок. О существенных изменениях условий мы предупредим в приложении заранее; если вы продолжаете пользоваться sonly после вступления изменений в силу, вы с ними согласны.',
      ]],
      ['13. Ответственность', [
        'sonly предоставляется «как есть». В пределах, допускаемых законом, мы не отвечаем за косвенные убытки, упущенную выгоду и последствия использования sonly не по назначению. Наша общая ответственность ограничена суммой, которую вы заплатили за подписку за последние 12 месяцев. Это не ограничивает ответственность, которую по закону нельзя ограничить (например, за умысел или вред жизни и здоровью), и ваши права потребителя.',
      ]],
      ['14. Прекращение', [
        'Вы можете перестать пользоваться sonly в любой момент: отменить подписку в магазине и удалить приложение. Мы можем прекратить работу sonly, предупредив заранее; если это случится во время оплаченной подписки, вы сможете получить возврат за неиспользованный период через магазин или от нас.',
      ]],
      ['15. Право и споры', [
        `К этим условиям применяется право страны ${o.law}, если обязательные нормы страны вашего проживания не дают вам большей защиты. Споры решаются переговорами, а если не получилось — в суде г. ${o.court} или в суде по месту вашего жительства, если так требует закон о защите потребителей. Жители ЕС также могут воспользоваться платформой ЕС для онлайн-урегулирования споров.`,
      ]],
      ['16. Контакты', [`${o.name}, ${o.addr}. Почта: ${o.mail}.`]],
    ],
    en: (o) => [
      ['1. About these terms', [
        `This is an agreement between you and ${o.name} (${o.addr}, ${o.reg}; “we”) on using the sonly app and website (“sonly”). By installing or using sonly you agree to these terms and the Privacy Policy. If you don’t agree, don’t use sonly.`,
        'If you buy a subscription through the App Store or Google Play, the store’s rules also apply to the purchase. These terms don’t limit your statutory consumer rights in your country.',
      ]],
      ['2. What sonly is', [
        'sonly is an alarm clock that can’t be snoozed or turned off until you complete a task: solve sums, find an object, do squats, say a phrase and more. sonly also has wake-up statistics, streaks, badges, postcards, friends, your own sounds, a wake-up check and a partner program.',
        'Wake-up check: if it is on, some time after the task sonly asks “Are you awake?”. If you don’t answer within a minute, the alarm rings again. You can turn it off in the alarm settings.',
      ]],
      ['3. Who can use sonly', [
        'You must be at least 13. If your country requires a higher age for such agreements, you confirm you have consent from a parent or legal guardian. Purchases and the partner program are for persons with full legal capacity aged 18+, or with parental consent where the law allows.',
      ]],
      ['4. Alarm reliability — important', [
        '!!We do everything to make the alarm ring on time. But ringing also depends on your phone: battery, power-saving mode, Do Not Disturb, volume, permissions, system updates, manufacturer settings. Check it with “Test alarm” and the “Alarm readiness” screen.',
        'For events you can’t miss (a flight, an exam, time-critical medication) set a backup alarm. To the extent permitted by law, we are not liable for the consequences of an alarm that didn’t ring or rang late because of the phone, its settings or the operating system rather than our error.',
      ]],
      ['5. Health and safety', [
        '!!Physical tasks (squats, push-ups, jumps, steps, shaking) are light exercise, but do them only if they are not contraindicated for you. Stop if you feel pain, dizziness or discomfort. If you have heart or joint conditions or are pregnant, consult a doctor and choose another task.',
        'Don’t do tasks where it is dangerous: while driving, on stairs, near an edge, on a slippery floor. Don’t film other people without their consent.',
        'The “Pills” task is only a reminder. sonly gives no medical advice, doesn’t track medication intake and doesn’t replace a doctor. sonly doesn’t treat sleep disorders.',
      ]],
      ['6. Subscription and payment', [
        '!iSome features are available with a subscription: monthly (€6.99) or yearly (€39.99). Prices in your country may differ and are shown in the store before purchase, including taxes.',
        ul(['payment is charged to your App Store or Google Play account at confirmation of purchase;',
          '<b>the subscription renews automatically</b> for the same period unless auto-renew is turned off at least 24 hours before the end of the period;',
          'you can turn off auto-renew in your store account settings; deleting the app doesn’t cancel the subscription;',
          'the 3-day free trial is available only with a promo code; if you don’t cancel before the trial ends, the paid period begins;',
          'a promo code or offer discount (−25% for the first year) applies to the first year only, then the regular price applies;',
          'refunds follow Apple’s or Google’s rules; in the EU you consent to immediate access to digital content and acknowledge that, once you start using it, the 14-day right of withdrawal may be lost to the extent permitted by law;',
          'we will notify you in advance of price increases, as store rules and the law require.']),
      ]],
      ['7. Promo codes', [
        'A valid promo code gives a free trial and a first-year discount. One promo code — one purchase per store account. Promo codes have no cash value, may expire and may be disabled in case of abuse.',
      ]],
      ['8. Your content', [
        'Your sounds, name, bio, avatar and photos belong to you. You confirm that you have the rights to files you add (for example, songs from your phone) and use them only for yourself. To show your name, avatar and status to friends, you give us a free, non-exclusive permission to store and display them solely to operate sonly.',
        'You may not use a name, avatar or code that is offensive, unlawful, infringes others’ rights or impersonates another person or sonly.',
      ]],
      ['9. Music previews', [
        'Song previews come from Apple’s public catalog and are for personal use only as an alarm sound in sonly. The rights to the music belong to its rights holders.',
      ]],
      ['10. What is not allowed', [
        ul(['hacking, reverse-engineering or modifying sonly, bypassing the subscription or protections;',
          'overloading servers, scraping data, spamming through Friends;',
          'impersonating others, harassing or insulting other users;',
          'using sonly in breach of the law.']),
        'If you breach these rules, we may restrict server-based features (Friends, partner program) or delete your profile. A paid subscription is then governed by the store’s rules.',
      ]],
      ['11. Intellectual property', [
        'sonly, its design, texts, tasks, illustrations, logo and characters belong to us or are used under licence. You get a personal, non-exclusive, non-transferable right to use sonly on your devices. Alarm sounds are recordings under the CC0 licence (authors are listed in “Settings → Sounds and credits”).',
      ]],
      ['12. Changes and availability', [
        'We keep improving sonly: we add, change and sometimes remove features. We try to keep sonly always available but don’t promise it will be uninterrupted or error-free. We will warn you in the app in advance about material changes to these terms; if you keep using sonly after the changes take effect, you accept them.',
      ]],
      ['13. Liability', [
        'sonly is provided “as is”. To the extent permitted by law, we are not liable for indirect losses, lost profits or consequences of using sonly for purposes it isn’t intended for. Our total liability is limited to the amount you paid for the subscription in the last 12 months. This doesn’t limit liability that can’t be limited by law (for example, for intent or harm to life and health) or your consumer rights.',
      ]],
      ['14. Termination', [
        'You can stop using sonly at any time: cancel the subscription in the store and delete the app. We may discontinue sonly with advance notice; if this happens during a paid subscription, you can get a refund for the unused period through the store or from us.',
      ]],
      ['15. Governing law and disputes', [
        `These terms are governed by the law of ${o.law}, unless mandatory rules of your country of residence give you greater protection. Disputes are settled by negotiation and, failing that, in the courts of ${o.court} or of your place of residence where consumer law requires. EU residents may also use the EU Online Dispute Resolution platform.`,
      ]],
      ['16. Contact', [`${o.name}, ${o.addr}. Email: ${o.mail}.`]],
    ],
  };

  /* ── Условия партнёрской программы ───────────────────────── */
  const partner = {
    ru: (o) => [
      ['1. Что это', [
        `Партнёрская программа sonly позволяет получать долю с покупок подписки людьми, которые ввели ваш промокод. Программу ведёт ${o.name}. Участвуя, вы принимаете эти условия, Условия использования и Политику конфиденциальности.`,
      ]],
      ['2. Кто может участвовать', [
        'Дееспособные лица от 18 лет, которые могут законно получать доход в своей стране. Для блогерской программы — от 50 000 подписчиков и 1 млн просмотров в месяц; заявку мы рассматриваем и можем отклонить без объяснения причин.',
      ]],
      ['3. Промокод', [
        'Код — от 3 до 7 латинских букв и цифр, уникальный. Его можно сменить в любой момент; старый код сразу перестаёт работать. Мы можем отклонить или изменить код, который оскорбителен, вводит в заблуждение, совпадает с чужой торговой маркой или служебным словом.',
        'По коду покупатель получает 3 дня бесплатно и −25 % на первый год.',
      ]],
      ['4. Доля и уровни', [
        'Доля считается от суммы, которая остаётся после комиссии магазина (App Store, Google Play — обычно 15 %) и налогов, удержанных магазином.',
        '@levels',
        'Засчитывается <b>первая оплата подписки</b> покупателя по вашему коду. Пробные дни, возвраты, отменённые и мошеннические покупки не засчитываются. Если покупка возвращена после начисления, её доля вычитается из будущих выплат.',
      ]],
      ['5. Выплаты', [
        'Покупка подтверждается, когда магазин перестаёт принимать по ней возврат: новым партнёрам — через 90 дней, после 3 выплат — через 60, после 10 — через 30. Подтверждённые суммы выплачиваются раз в месяц на карту или PayPal. Минимальная выплата — 5 €, остаток переходит на следующий месяц. Комиссии платёжного сервиса и банка могут удерживаться из суммы.',
        'Вы сами отвечаете за налоги со своего дохода и за регистрацию, если её требует закон вашей страны. Мы можем попросить данные для налоговой отчётности и не выплачивать деньги, пока они не предоставлены.',
      ]],
      ['6. Что запрещено', [
        ul(['покупать по своему коду, в том числе через другие аккаунты, и просить об этом знакомых за вознаграждение;',
          'спам в комментариях, личных сообщениях, чатах и по почте;',
          'накрутки, боты, мотивированные установки «за вознаграждение»;',
          'реклама от имени sonly, поддельные официальные аккаунты, использование логотипа так, будто вы — sonly;',
          'контекстная реклама по слову «sonly» и его вариантам;',
          'ложные обещания: «бесплатно навсегда», «гарантированно вылечит бессонницу» и подобное;',
          'размещение кода на сайтах с незаконным содержимым.']),
        'Рекламу нужно помечать так, как требует закон вашей страны (например, «реклама» или #ad). При нарушении мы можем заблокировать код, не выплатить начисления за нарушающие покупки и исключить вас из программы.',
      ]],
      ['7. Изменения и прекращение', [
        'Мы можем менять проценты, сроки и правила, предупредив в приложении не менее чем за 30 дней; уже подтверждённые начисления пересчёту не подлежат. Вы можете выйти из программы в любой момент; подтверждённые суммы от минимальной выплаты будут выплачены.',
      ]],
      ['8. Ответственность', [
        'Вы действуете от своего имени, а не как наш сотрудник или представитель. Мы не гарантируем доход. В пределах, допускаемых законом, наша ответственность по программе ограничена суммой начислений за последние 12 месяцев.',
      ]],
      ['9. Контакты', [`Вопросы по программе: ${o.mail}.`]],
    ],
    en: (o) => [
      ['1. What it is', [
        `The sonly partner program lets you earn a share of subscription purchases made by people who entered your promo code. The program is run by ${o.name}. By taking part you accept these terms, the Terms of Use and the Privacy Policy.`,
      ]],
      ['2. Who can join', [
        'Persons with full legal capacity aged 18+ who can lawfully receive income in their country. The creator program requires 50,000+ followers and 1M+ monthly views; we review applications and may decline them without giving reasons.',
      ]],
      ['3. Promo code', [
        'A code is 3–7 Latin letters and digits and must be unique. You can change it at any time; the old code stops working immediately. We may reject or change a code that is offensive, misleading, matches someone else’s trademark or a reserved word.',
        'With the code a buyer gets 3 days free and −25% for the first year.',
      ]],
      ['4. Share and levels', [
        'Your share is calculated from the amount left after the store’s commission (App Store, Google Play — usually 15%) and taxes withheld by the store.',
        '@levels',
        'What counts is the buyer’s <b>first subscription payment</b> with your code. Trial days, refunds, cancelled and fraudulent purchases don’t count. If a purchase is refunded after being credited, its share is deducted from future payouts.',
      ]],
      ['5. Payouts', [
        'A purchase is confirmed once the store no longer accepts refunds for it: for new partners after 90 days, after 3 payouts after 60, after 10 after 30. Confirmed amounts are paid monthly to a card or PayPal. The minimum payout is €5; the remainder carries over to the next month. Payment service and bank fees may be deducted.',
        'You are responsible for taxes on your income and for any registration your country’s law requires. We may ask for tax reporting details and withhold payment until they are provided.',
      ]],
      ['6. What is not allowed', [
        ul(['buying with your own code, including via other accounts, or paying others to do so;',
          'spam in comments, direct messages, chats and email;',
          'fake engagement, bots, incentivised installs;',
          'advertising on behalf of sonly, fake official accounts, using the logo as if you were sonly;',
          'paid search ads on the word “sonly” and its variants;',
          'false promises: “free forever”, “guaranteed to cure insomnia” and the like;',
          'placing the code on websites with unlawful content.']),
        'Ads must be labelled as your country’s law requires (for example, “ad” or #ad). In case of breach we may block the code, withhold earnings for offending purchases and remove you from the program.',
      ]],
      ['7. Changes and termination', [
        'We may change percentages, timelines and rules with at least 30 days’ notice in the app; earnings already confirmed are not recalculated. You can leave the program at any time; confirmed amounts at or above the minimum payout will be paid.',
      ]],
      ['8. Liability', [
        'You act on your own behalf, not as our employee or agent. We don’t guarantee income. To the extent permitted by law, our liability under the program is limited to your earnings in the last 12 months.',
      ]],
      ['9. Contact', [`Program questions: ${o.mail}.`]],
    ],
  };

  const DOCS = { privacy, terms, partner };
  TITLES.credits = { ru: 'Звуки и авторы', en: 'Sounds and credits' };
  const langOf = () => (Sonly.i18n && Sonly.i18n.lang === 'ru' ? 'ru' : (Sonly.i18n ? 'en' : 'ru'));
  /*
   * Оформление документа — как экран приложения, а не простыня текста:
   * шапка (значок, название, дата), «Главное» — три-четыре обещания со значками, оглавление (раскрывается, ведёт к разделу),
   * разделы — карточки с номером; определения («Камера — …») — строками с подписью; «!!» — жёлтая выноска «важно»,
   * «!i» — синяя «к сведению»; уровни партнёрки — плитками; в конце — карточка «Связаться».
   */
  const ICON = { terms: 'file-text', privacy: 'shield-check', partner: 'handshake', credits: 'music' };
  const MAIN = {
    privacy: { ru: [['smartphone', 'Всё хранится на телефоне'], ['ban', 'Без рекламы и трекеров'], ['eye-off', 'Снимки и голос не уходят с телефона'], ['hand-coins', 'Не продаём данные']],
      en: [['smartphone', 'Everything stays on your phone'], ['ban', 'No ads or trackers'], ['eye-off', 'Photos and voice never leave the phone'], ['hand-coins', 'We never sell data']] },
    terms: { ru: [['alarm-clock', 'Будильник выключает только задание'], ['repeat', 'Подписка продлевается сама — отменить можно в магазине'], ['heart-pulse', 'Физические задания — по самочувствию'], ['bell-plus', 'Для важных дел — запасной будильник']],
      en: [['alarm-clock', 'Only a task turns the alarm off'], ['repeat', 'The subscription renews itself — cancel in the store'], ['heart-pulse', 'Physical tasks — only if you feel well'], ['bell-plus', 'For crucial events — a backup alarm']] },
    partner: { ru: [['percent', 'От 10 до 25 % с каждой первой оплаты'], ['calendar-clock', 'Выплаты через 30–90 дней, раз в месяц'], ['ban', 'Без спама и покупок по своему коду']],
      en: [['percent', '10–25% of every first payment'], ['calendar-clock', 'Payouts after 30–90 days, monthly'], ['ban', 'No spam and no buying with your own code']] },
  };
  const LEVELS = [[0, 10], [5, 15], [20, 20], [50, 25]];
  const T = {
    ru: { main: 'Главное', toc: 'Содержание', parts: (n) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'раздел' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'раздела' : 'разделов'}`, eff: 'Действует с', warn: 'Важно', info: 'К сведению', contact: 'Связаться с нами', start: 'сразу', after: (n) => `после ${n} покупок`, creator: 'Блогерам — до 40 % по отдельному соглашению' },
    en: { main: 'The essentials', toc: 'Contents', parts: (n) => `${n} sections`, eff: 'Effective', warn: 'Important', info: 'Good to know', contact: 'Contact us', start: 'from the start', after: (n) => `after ${n} purchases`, creator: 'Creators — up to 40% under a separate agreement' },
  };
  const { ic } = Sonly;
  const para = (p, t) => {
    if (p.startsWith('<ul')) return p;
    if (p === '@levels') return `<div class="legal-levels">${LEVELS.map(([n, pct]) => `<div><b>${pct}${t === T.ru ? ' ' : ''}%</b><small>${n ? t.after(n) : t.start}</small></div>`).join('')}</div><p class="legal-small">${t.creator}</p>`;
    if (p.startsWith('!!') || p.startsWith('!i')) {
      const warn = p[1] === '!';
      return `<div class="legal-call ${warn ? 'warn' : 'info'}"><i>${ic(warn ? 'triangle-alert' : 'info', 18, 2.3)}</i><div><b>${warn ? t.warn : t.info}</b><p>${p.slice(2)}</p></div></div>`;
    }
    const m = /^<b>([^<]+)<\/b>\s*(?:—\s*)?([\s\S]*)$/.exec(p);
    /* «Камера (задания …). Кадры …» — пояснение в скобках становится серой подписью под названием. */
    if (m) {
      const cap = (x) => x.replace(/^([a-zа-яё])/, (c) => c.toUpperCase());
      const body = m[2].startsWith('(') ? m[2].replace(/^\(([^)]*)\)\.?\s*/, (_, e) => `<em>${cap(e)}</em>`) : cap(m[2]);
      return `<div class="legal-def"><b>${m[1].replace(/\.$/, '')}</b><p>${body}</p></div>`;
    }
    return `<p>${p}</p>`;
  };
  /** Текст документа: id — 'terms', 'privacy', 'partner', 'credits'. На языках кроме русского и английского — английский с пометкой. */
  function html(id) {
    if (id === 'credits') return credits();
    const doc = DOCS[id] || DOCS.terms, L = langOf(), lang = Sonly.i18n ? Sonly.i18n.lang : 'ru', t = T[L];
    const o = Object.fromEntries(Object.entries(OWNER[L]).map(([k, v]) => [k, fill(v)]));
    const note = !['ru', 'en'].includes(lang) ? `<p class="legal-note">${ic('languages', 15, 2.2)}${({ uk: 'Документ поки доступний англійською.', pl: 'Dokument jest obecnie dostępny po angielsku.', de: 'Das Dokument ist derzeit auf Englisch verfügbar.', es: 'Por ahora el documento está disponible en inglés.', fr: 'Le document est pour l’instant disponible en anglais.' })[lang] || ''}</p>` : '';
    const all = doc[L](o), intro = all.filter(([h]) => !/^\d/.test(h)), list = all.filter(([h]) => /^\d/.test(h));
    const hero = `<header class="legal-hero"><i class="legal-ic">${ic(ICON[id] || 'file-text', 26, 2.1)}</i><h1>${title(id)}</h1><p class="legal-date">${t.eff} ${DATE[L]}</p>${note}</header>`;
    const main = MAIN[id] ? `<div class="legal-main"><h3>${t.main}</h3>${MAIN[id][L].map(([icon, x]) => `<div class="legal-pt"><i>${ic(icon, 17, 2.3)}</i><span>${x}</span></div>`).join('')}${intro.map(([, ps]) => ps.map((p) => `<p>${p}</p>`).join('')).join('')}</div>` : '';
    const toc = `<details class="legal-toc"><summary><span>${ic('list', 17, 2.3)}${t.toc}</span><small>${t.parts(list.length)}</small>${ic('chevron-down', 18, 2.4)}</summary><ol>${list.map(([h], i) => { const [, n, name] = /^(\d+)\.\s*(.*)$/.exec(h); return `<li><button data-legal-go="lg-${id}-${i}"><u>${n}</u>${name}</button></li>`; }).join('')}</ol></details>`;
    const secs = list.map(([h, ps], i) => {
      const [, n, name] = /^(\d+)\.\s*(.*)$/.exec(h);
      return `<section class="legal-sec" id="lg-${id}-${i}"><h2><u>${n}</u>${name}</h2>${ps.map((p) => para(p, t)).join('')}</section>`;
    }).join('');
    const contact = `<div class="legal-contact"><i>${ic('mail', 19, 2.2)}</i><div><b>${t.contact}</b><p>${o.mail}</p><small>${o.name}</small></div></div>`;
    return `<article class="legal" data-i18n="off" lang="${L}">${hero}${main}${toc}${secs}${contact}</article>`;
  }
  /* Оглавление: переход к разделу — прокруткой листа, без смены адреса страницы (по адресу переключаются вкладки прототипа). */
  if (typeof document !== 'undefined') document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-legal-go]');
    if (!b) return;
    const art = b.closest('.legal'), sec = art && art.querySelector('#' + b.dataset.legalGo), sc = sec && sec.closest('.scroll, .legal-body');
    if (!sec || !sc) return;
    const top = sc.scrollTop + sec.getBoundingClientRect().top - sc.getBoundingClientRect().top - 12;
    sc.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
  /* Звуки и авторы: список из snd/CREDITS.txt (все записи — CC0, авторов указываем из уважения). */
  function credits() {
    const L = langOf();
    const box = `<article class="legal legal-cr js-credits" data-i18n="off" lang="${L}"><header class="legal-hero"><i class="legal-ic">${ic('music', 26, 2.1)}</i><h1>${title('credits')}</h1></header>
      <p class="legal-intro">${L === 'ru' ? 'Все звуки — записи с Freesound под лицензией CC0 (общественное достояние). Указывать авторов не обязательно, но мы благодарим каждого.' : 'All sounds are recordings from Freesound under the CC0 licence (public domain). Credit isn’t required, but we thank every author.'}</p><p class="legal-date">…</p></article>`;
    setTimeout(() => {
      fetch('snd/CREDITS.txt').then((r) => (r.ok ? r.text() : '')).then((t) => {
        const el = document.querySelector('.js-credits');
        if (!el || !t) return;
        const esc = (v) => v.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
        /* Звуки будильника — под своими названиями на языке интерфейса; звуки наград — по тому, где звучат. */
        const FXN = { badge: ['Новый значок', 'New badge'], rare: ['Редкий значок', 'Rare badge'], card: ['Открытка', 'Postcard'], twinkle: ['Искры', 'Sparkle'], scene: ['Новый пейзаж', 'New landscape'],
          whoosh: ['Полёт во вкладку', 'Flying to a tab'], pop: ['Прилёт', 'Arrival'], fire: ['Огонь серии', 'Streak flame'], win: ['Число серии', 'Streak number'] };
        const rows = t.split(/\r?\n/).map((x) => {
          const fx = /^snd\/fx\/([a-z]+)\.mp3:\s*(.*)$/.exec(x), m = /^snd\/[a-z]+\.mp3 — «([^»]+)»:\s*(.*)$/.exec(x);
          if (!fx && !m) return '';
          const name = fx ? (FXN[fx[1]] || [fx[1], fx[1]])[L === 'ru' ? 0 : 1] : L === 'ru' || !Sonly.i18n ? m[1] : Sonly.i18n.word(m[1]);
          const parts = (fx ? fx[2] : m[2]).split(' — ');
          return `<li><b>${esc(name)}</b><span>${esc(parts[0] || '')} — ${esc(parts[1] || '')}</span></li>`;
        });
        el.querySelector('.legal-date').outerHTML = `<ul class="legal-list">${rows.join('')}</ul>`;
      }).catch(() => {});
    }, 0);
    return box;
  }
  const title = (id) => (TITLES[id] || TITLES.terms)[langOf()];
  /* Короткое название — для шапки страницы и листа, где длинное не помещается в строку; полное — крупно в самом документе. */
  const SHORT = { terms: { ru: 'Условия', en: 'Terms' }, privacy: { ru: 'Конфиденциальность', en: 'Privacy' }, partner: { ru: 'Условия программы', en: 'Program terms' }, credits: { ru: 'Звуки и авторы', en: 'Sounds and credits' } };
  const short = (id) => (SHORT[id] || SHORT.terms)[langOf()];
  /** Документ по названию из кнопки онбординга («Условия использования» и т. п.). */
  const byName = (name) => (/онфиденц|rivacy/.test(name) ? 'privacy' : /артн|artner/.test(name) ? 'partner' : 'terms');
  Sonly.legal = { html, title, short, byName, ids: Object.keys(DOCS) };
})();
