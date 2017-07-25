$(function () {
  const DATE = ['日', '月', '火', '水', '木', '金', '土'];
  const HOUR_WAGE = 1100;
  const API_URL = 'https://holidays-jp.github.io/api/v1/date.json';
  var _holidays = null;

  function initialize() {
    render();
    template('#result', '#tpl-result', {
      workDays: 0,
      workTime: 0,
      holidays: 0,
      totalIncome: 0
    });
    $("#notice-space").empty();
  }

  function template(dst, tpl, data) {
    var compiled = _.template($(tpl).html());
    $(dst).html(compiled(data));
  }

  function render() {
    var year = new Date().getFullYear();
    template('#standard .during', '#tpl-during', {start: year+'-01-01', end: year+'-12-31'});
    template('#option .during'  , '#tpl-during', {start: year+'-08-01', end: year+'-10-01'});

    template('#standard .shift', '#tpl-shift', {date: DATE});
    template('#option .shift'  , '#tpl-shift', {date: DATE});
  }

  function getFormatDate(str, date) {
    date = date || new Date();
  }


   // Ex: timeDiff('19:20', '10:50') // => 8.5
  function timeDiff(a, b) {
    a = a.split(':');
    b = b.split(':');
    return a[0] - b[0] + ((a[1] - b[1]) / 60.0);
  }

  // Get params
  function getParam () {
    var hour_wage = $('[name="hour-wage"]').val();
    var during    = $('#standard .during input').map(function () { return $(this).val()}).get();
    var shift     = parseShift($('#standard .shift > div'));

    var option = {};
    if($('#option').is(':visible')) {
      var optionShift = parseShift($('#option .shift > div'));
      if(Object.keys(optionShift).length) {
        option['shift']  = optionShift;
        option['during'] = $('#option .during input').map(function () { return $(this).val()}).get();
      }
    }

    return {
      during: during,
      hour_wage: hour_wage,
      shift: shift,
      option: option
    }
  }

  function parseShift (dom) {
    var shift = {};
    dom.each(function (i, v) {
      var input = $(v).children('[type="time"]:enabled');
      if (input.size()) {
        var time = timeDiff(
          input.filter('[name="end"]').val(),
          input.filter('[name="start"]').val()
        );
        if (6 < time && time <= 8) time -= 0.45;
        else if(time > 8) time -= 1;

        var key = parseInt($(v).attr('class').replace('week_', ''), 10);
        shift[key] = time;
      }
    });
    return shift;
  }

  function showResult (data) {
    $('#result').html(
      '<div class="alert alert-info">¥ '
    + data['total_income'].toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,")
    + '</div>');
  }

  // 総額の計算
  function getTotalIncome(hourWage, during, shift) {
    var totalIncome = 0
    ,   [start, end] = during;
    hourWage = (hourWage == '') ? HOUR_WAGE : hourWage;

    // var holidays = countHolidays(start, end, _.keys(shift));
    _.each(shift, function (time, youbi) {
      var num =  getNumYoubi(youbi, start, end);
      var holidays = countHolidays(youbi, start, end);
      totalIncome += hourWage * time * (num - holidays);
    });

    return totalIncome;
  }

  // 指定期間中にある指定曜日の個数を返却
  function getNumYoubi(youbi, start, end) {
    var s = new Date(start);
    var e = new Date(end);
    var daySec = 1000*60*60*24;

    var diff = youbi - s.getDay();
    if(diff >= 0) diff -= 7;

    s.setDate(s.getDate() + diff);
    var days = (e.getTime() - s.getTime()) / daySec;
    return Math.floor(days / 7);
  }

  // 指定期間中にある指定曜日が祝日である日数を返却
  function countHolidays(youbi, start, end) {
    var holidays = getHolidayList()
    ,   s = new Date(start)
    ,   e = new Date(end)
    ,   filtered = _.filter(holidays, function (holiday) {
      var h = new Date(holiday);
      return (s < h && h < e) && +youbi === h.getDay();
    });

    console.log("[debug] 祝日リスト ", filtered);

    return filtered.length;
  }


  function getHolidayList() {
    if (_holidays == null) {
      var holidays = getHolidaysFromAPI();
      if (!holidays) {
        return alertMessage("祝日の取得に失敗したため、祝日が考慮されません。");
      }
      _holidays = holidays;
    }
    return _holidays;
  }

  function getHolidaysFromAPI() {
    var holidays;
    $.ajax({
      url: API_URL,
      async: false,
      success: function (data) {
        holidays = _.keys(data);
      },
      error: function () {
        holidays = false;
      }
    });
    return holidays;
  }

  function alertMessage (mes) {
    console.log("[WIP] "+mes);
    template("#notice-space", "#tpl-notice", {message: mes});
  }

  // Toggle checkbox
  $(document).on('change', '.week-checkbox', function () {
    var $this = $(this);
    $this.siblings('input[type="time"]').prop('disabled', !$this.prop('checked'));
  });

  // Toggle Option Visible
  $(document).on('click', '#option-btn', function () {
    $('#option').toggle(200);
  });

  // Revert to default
  $(document).on('click', '#revert', function () {
    $('[name="hour-wage"]').val('');
    initialize();
  });

  // Calculate Request
  $(document).on('click', '#calc', function () {
    $("#notice-space").empty();
    var params = getParam();
    var totalIncome = getTotalIncome(params['hour_wage'], params['during'], params['shift']);
    if(Object.keys(params.option).length > 0) {
      var option = params.option;
      var normalIncome = getTotalIncome(params['hour_wage'], option['during'], params['shift']);
      var optionIncome = getTotalIncome(params['hour_wage'], option['during'], option['shift']);
      totalIncome -= normalIncome - optionIncome;
    }

    var result = totalIncome.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
    template('#result', '#tpl-result', {totalIncome: result});
  });


  $(document).on('click', '#help', function () {
       $('#pop-help, #mask').show();
   });
   $(document).on('click', '#pop-close, #mask', function(e) {
       $('#pop-help, #mask').hide();
   });

  initialize();
});
