(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as anonymous module.
    define('datepicker', ['jquery'], factory);
  } else if (typeof exports === 'object') {
    // Node / CommonJS
    factory(require('jquery'));
  } else {
    // Browser globals.
    factory(jQuery);
  }
})(function ($) {

  'use strict';

  var $window = $(window);
  var $document = $(document);
  var NAMESPACE = 'datepicker';
  var EVENT_CLICK = 'click.' + NAMESPACE;
  var EVENT_KEYUP = 'keyup.' + NAMESPACE;
  var EVENT_FOCUS = 'focus.' + NAMESPACE;
  var EVENT_RESIZE = 'resize.' + NAMESPACE;

  function Datepicker(element, options) {
    this.$element = $(element);
    this.options = $.extend({}, Datepicker.DEFAULTS, $.isPlainObject(options) && options);
    this.visible = false;
    this.isInput = false;
    this.isInline = false;
    this.init();
  }

  function isNumber(n) {
    return typeof n === 'number';
  }

  function isLeapYear (year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  function getDaysInMonth (year, month) {
    return [31, (isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
  }

  function parseFormat (format) {
    var separator = format.match(/[.\/\-\s].*?/) || '/';
    var parts = format.split(/\W+/);
    var length;
    var i;

    if (!parts || parts.length === 0) {
      throw new Error('Invalid date format.');
    }

    format = {
      separator: separator[0],
      parts: parts
    };

    length = parts.length;

    for (i = 0; i < length; i++) {
      switch (parts[i]) {
        case 'dd':
        case 'd':
          format.day = true;
          break;

        case 'mm':
        case 'm':
          format.month = true;
          break;

        case 'yyyy':
        case 'yy':
          format.year = true;
          break;

        // No default
      }
    }

    return format;
  }

  function parseDate (date, format) {
    var parts;
    var length;
    var year;
    var day;
    var month;
    var val;
    var i;

    parts = typeof date === 'string' && date ? date.split(format.separator) : [];
    length = format.parts.length;

    date = new Date();
    year = date.getFullYear();
    day = date.getDate();
    month = date.getMonth();

    if (parts.length === length) {
      for (i = 0; i < length; i++) {
        val = parseInt(parts[i], 10) || 1;

        switch (format.parts[i]) {
          case 'dd':
          case 'd':
            day = val;
            break;

          case 'mm':
          case 'm':
            month = val - 1;
            break;

          case 'yy':
            year = 2000 + val;
            break;

          case 'yyyy':
            year = val;
            break;

          // No default
        }
      }
    }

    return new Date(year, month, day, 0, 0, 0, 0);
  }

  function formatDate (date, format) {
    var val = {
          d: date.getDate(),
          m: date.getMonth() + 1,
          yy: date.getFullYear().toString().substring(2),
          yyyy: date.getFullYear()
        };
    var parts = [];
    var length = format.parts.length;
    var i;

    val.dd = (val.d < 10 ? '0' : '') + val.d;
    val.mm = (val.m < 10 ? '0' : '') + val.m;

    for (i = 0; i < length; i++) {
      parts.push(val[format.parts[i]]);
    }

    return parts.join(format.separator);
  }

  Datepicker.prototype = {
    constructor: Datepicker,

    init: function () {
      var $this = this.$element;
      var options = this.options;
      var $picker;

      this.$trigger = $(options.trigger || $this);
      this.$picker = $picker = $(options.template);
      this.$years = $picker.find('[data-type="years picker"]');
      this.$months = $picker.find('[data-type="months picker"]');
      this.$days = $picker.find('[data-type="days picker"]');
      this.isInput = $this.is('input') || $this.is('textarea');
      this.isInline = options.inline && (options.container || !this.isInput);

      if (this.isInline) {
        $picker.find('.datepicker-arrow').hide();
        $(options.container || $this).append($picker);
      } else {
        $(options.container || 'body').append($picker);
        this.place();
        $picker.hide();
      }

      if (options.date) {
        $this.data('date', options.date);
      }

      this.format = parseFormat(options.dateFormat);
      this.fillWeek();
      this.bind();
      this.update();

      if (this.isInline) {
        this.show();
      }
    },

    bind: function () {
      var $this = this.$element;
      var options = this.options;

      this.$picker.on(EVENT_CLICK, $.proxy(this.click, this));

      if (!this.isInline) {
        if (this.isInput) {
          $this.on(EVENT_KEYUP, $.proxy(this.update, this));

          if (!options.trigger) {
            $this.on(EVENT_FOCUS, $.proxy(this.show, this));
          }
        }

        this.$trigger.on(EVENT_CLICK, $.proxy(this.show, this));
      }
    },

    unbind: function () {
      var $this = this.$element;
      var options = this.options;

      this.$picker.off(EVENT_CLICK, this.click);

      if (!this.isInline) {
        if (this.isInput) {
          $this.off(EVENT_KEYUP, this.update);

          if (!options.trigger) {
            $this.off(EVENT_FOCUS, this.show);
          }
        }

        this.$trigger.off(EVENT_CLICK, this.show);
      }
    },

    showView: function (type) {
      var format = this.format;

      if (format.year || format.month || format.day) {
        switch (type) {

          case 2:
          case 'years':
            this.$months.hide();
            this.$days.hide();

            if (format.year) {
              this.fillYears();
              this.$years.show();
            } else {
              this.showView(0);
            }

            break;

          case 1:
          case 'months':
            this.$years.hide();
            this.$days.hide();

            if (format.month) {
              this.fillMonths();
              this.$months.show();
            } else {
              this.showView(2);
            }

            break;

          // case 0:
          // case 'days':
          default:
            this.$years.hide();
            this.$months.hide();

            if (format.day) {
              this.fillDays();
              this.$days.show();
            } else {
              this.showView(1);
            }
        }
      }
    },

    hideView: function () {
      if (this.options.autoClose) {
        this.hide();
      }
    },

    place: function () {
      var $trigger = this.$trigger;
      var offset = $trigger.offset();

      this.$picker.css({
        position: 'absolute',
        top: offset.top + $trigger.outerHeight(),
        left: offset.left,
        zIndex: this.options.zIndex
      });
    },

    show: function () {
      if (this.visible) {
        return;
      }

      this.visible = true;
      this.$picker.show();

      if (!this.isInline) {
        $window.on(EVENT_RESIZE, $.proxy(this.place, this));
        $document.on(EVENT_CLICK, $.proxy(function (e) {
          if (e.target !== this.$element[0]) {
            this.hide();
          }
        }, this));
      }

      this.showView(this.options.viewStart);
    },

    hide: function () {
      if (!this.visible) {
        return;
      }

      this.visible = false;
      this.$picker.hide();

      if (!this.isInline) {
        $window.off(EVENT_RESIZE, this.place);
        $document.off(EVENT_CLICK, this.hide);
      }
    },

    update: function () {
      var $this = this.$element;
      var date = $this.data('date') || (this.isInput ? $this.prop('value') : $this.text());

      this.date = date = parseDate(date, this.format);
      this.viewDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      this.fillAll();
    },

    change: function () {
      var $this = this.$element;
      var date = formatDate(this.date, this.format);

      if (this.isInput) {
        $this.prop('value', date);
      } else if (!this.isInline) {
        $this.text(date);
      }

      $this.data('date', date).trigger('change');
    },

    getMonthByNumber: function (month, short) {
      var options = this.options;
      var months = short ? options.monthsShort : options.months;

      return months[isNumber(month) ? month : this.date.getMonth()];
    },

    getDayByNumber: function (day, short, min) {
      var options = this.options;
      var days = min ? options.daysMin : short ? options.daysShort : options.days;

      return days[isNumber(day) ? day : this.date.getDay()];
    },

    getDate: function (format) {
      return format ? formatDate(this.date, this.format) : new Date(this.date);
    },

    template: function (data) {
      var options = this.options;
      var defaults = {
            text: '',
            type: '',
            selected: false,
            disabled: false
          };

      $.extend(defaults, data);

      return [
        '<' + options.itemTag + ' ',
        (defaults.selected ? 'class="' + options.selectedClass + '"' :
        defaults.disabled ? 'class="' + options.disabledClass + '"' : ''),
        (defaults.type ? ' data-type="' + defaults.type + '"' : ''),
        '>',
        defaults.text,
        '</' + options.itemTag + '>'
      ].join('');
    },

    fillAll: function () {
      this.fillYears();
      this.fillMonths();
      this.fillDays();
    },

    fillYears: function () {
      var title = '';
      var items = [];
      var suffix = this.options.yearSuffix || '';
      var year = this.date.getFullYear();
      var viewYear = this.viewDate.getFullYear();
      var isCurrent;
      var i;

      title = (viewYear - 5) + suffix + ' - ' + (viewYear + 6) + suffix;

      for (i = -5; i < 7; i++) {
        isCurrent = (viewYear + i) === year;
        items.push(this.template({
          text: viewYear + i,
          type: isCurrent ? 'year selected' : 'year',
          selected: isCurrent,
          disabled: i === -5 || i === 6
        }));
      }

      this.$picker.find('[data-type="years current"]').html(title);
      this.$picker.find('[data-type="years"]').empty().html(items.join(''));
    },

    fillMonths: function () {
      var title = '';
      var items = [];
      var options = this.options.monthsShort;
      var year = this.date.getFullYear();
      var month = this.date.getMonth();
      var viewYear = this.viewDate.getFullYear();
      var isCurrent;
      var i;

      title = viewYear.toString() + this.options.yearSuffix || '';

      for (i = 0; i < 12; i++) {
        isCurrent = viewYear === year && i === month;

        items.push(this.template({
          text: options[i],
          type: isCurrent ? 'month selected' : 'month',
          selected: isCurrent
        }));
      }

      this.$picker.find('[data-type="year current"]').html(title);
      this.$picker.find('[data-type="months"]').empty().html(items.join(''));
    },

    fillWeek: function () {
      var options = this.options;
      var items = [];
      var days = options.daysMin;
      var weekStart = parseInt(options.weekStart, 10) % 7;
      var i;

      days = $.merge(days.slice(weekStart), days.slice(0, weekStart));

      for (i = 0; i < 7; i++) {
        items.push(this.template({
          text: days[i]
        }));
      }

      this.$picker.find('[data-type="week"]').html(items.join(''));
    },

    fillDays: function () {
      var title = '';
      var items = [];
      var prevItems = [];
      var currentItems = [];
      var nextItems = [];
      var options = this.options.monthsShort;
      var suffix = this.options.yearSuffix || '';
      var year = this.date.getFullYear();
      var month = this.date.getMonth();
      var day = this.date.getDate();
      var viewYear = this.viewDate.getFullYear();
      var viewMonth = this.viewDate.getMonth();
      var weekStart = parseInt(this.options.weekStart, 10) % 7;
      var isCurrent;
      var isDisabled;
      var length;
      var date;
      var i;
      var n;

      // Title of current month
      title = this.options.showMonthAfterYear ? (viewYear + suffix + ' ' + options[viewMonth]) : options[viewMonth] + ' ' + viewYear + suffix;

      // Days of prev month
      length = viewMonth === 0 ? getDaysInMonth(viewYear - 1, 11) : getDaysInMonth(viewYear, viewMonth - 1);

      for (i = 1; i <= length; i++) {
        prevItems.push(this.template({
          text: i,
          type: 'day prev',
          disabled: true
        }));
      }

      date = new Date(viewYear, viewMonth, 1, 0, 0, 0, 0); // The first day of current month
      n = (7 + (date.getDay() - weekStart)) % 7;
      n = n > 0 ? n : 7;
      prevItems = prevItems.slice((length - n));

      // Days of prev month next
      length = viewMonth === 11 ? getDaysInMonth(viewYear + 1, 0) : getDaysInMonth(viewYear, viewMonth + 1);

      for (i = 1; i <= length; i++) {
        nextItems.push(this.template({
          text: i,
          type: 'day next',
          disabled: true
        }));
      }

      length = getDaysInMonth(viewYear, viewMonth);
      date = new Date(viewYear, viewMonth, length, 0, 0, 0, 0); // The last day of current month
      n = (7 - (date.getDay() + 1 - weekStart)) % 7;
      n = n >= (7 * 6 - (prevItems.length + length)) ? n : n + 7; // 7 * 6 : 7 columns & 6 rows, 42 items
      nextItems = nextItems.slice(0, n);

      // Days of current month
      for (i = 1; i <= length; i++) {
        isCurrent = viewYear === year && viewMonth === month && i === day;
        isDisabled = this.options.isDisabled(new Date(viewYear, viewMonth, i));

        currentItems.push(this.template({
          text: i,
          type: isDisabled ? 'day disabled' : isCurrent ? 'day selected' : 'day',
          selected: isCurrent,
          disabled: isDisabled
        }));
      }

      // Merge all the days
      $.merge(items, prevItems);
      $.merge(items, currentItems);
      $.merge(items, nextItems);

      this.$picker.find('[data-type="month current"]').html(title);
      this.$picker.find('[data-type="days"]').empty().html(items.join(''));
    },

    click: function (e) {
      var $target = $(e.target);
      var yearRegex = /^\d{2,4}$/;
      var isYear = false;
      var viewYear;
      var viewMonth;
      var viewDay;
      var year;
      var type;

      e.stopPropagation();
      e.preventDefault();

      if ($target.length === 0) {
        return;
      }

      viewYear = this.viewDate.getFullYear();
      viewMonth = this.viewDate.getMonth();
      viewDay = this.viewDate.getDate();
      type = $target.data().type;

      switch (type) {
        case 'years prev':
        case 'years next':
          viewYear = type === 'years prev' ? viewYear - 10 : viewYear + 10;
          year = $target.text();
          isYear = yearRegex.test(year);

          if (isYear) {
            viewYear = parseInt(year, 10);
            this.date = new Date(viewYear, viewMonth, Math.min(viewDay, 28), 0, 0, 0, 0);
          }

          this.viewDate = new Date(viewYear, viewMonth, Math.min(viewDay, 28), 0, 0, 0, 0);
          this.fillYears();

          if (isYear) {
            this.showView(1);
            this.change();
          }

          break;

        case 'year prev':
        case 'year next':
          viewYear = type === 'year prev' ? viewYear - 1 : viewYear + 1;
          this.viewDate = new Date(viewYear, viewMonth, Math.min(viewDay, 28), 0, 0, 0, 0);
          this.fillMonths();
          break;

        case 'year current':

          if (this.format.year) {
            this.showView(2);
          }

          break;

        case 'year selected':

          if (this.format.month) {
            this.showView(1);
          } else {
            this.hideView();
          }

          break;

        case 'year':
          viewYear = parseInt($target.text(), 10);
          this.date = new Date(viewYear, viewMonth, Math.min(viewDay, 28), 0, 0, 0, 0);
          this.viewDate = new Date(viewYear, viewMonth, Math.min(viewDay, 28), 0, 0, 0, 0);

          if (this.format.month) {
            this.showView(1);
          } else {
            this.hideView();
          }

          this.change();
          break;

        case 'month prev':
        case 'month next':
          viewMonth = type === 'month prev' ? viewMonth - 1 : type === 'month next' ? viewMonth + 1 : viewMonth;
          this.viewDate = new Date(viewYear, viewMonth, Math.min(viewDay, 28), 0, 0, 0, 0);
          this.fillDays();
          break;

        case 'month current':

          if (this.format.month) {
            this.showView(1);
          }

          break;

        case 'month selected':

          if (this.format.day) {
            this.showView(0);
          } else {
            this.hideView();
          }

          break;

        case 'month':
          viewMonth = $target.parent().children().index($target);
          this.date = new Date(viewYear, viewMonth, Math.min(viewDay, 28), 0, 0, 0, 0);
          this.viewDate = new Date(viewYear, viewMonth, Math.min(viewDay, 28), 0, 0, 0, 0);

          if (this.format.day) {
            this.showView(0);
          } else {
            this.hideView();
          }

          this.change();
          break;

        case 'day prev':
        case 'day next':
        case 'day':
          viewMonth = type === 'day prev' ? viewMonth - 1 : type === 'day next' ? viewMonth + 1 : viewMonth;
          viewDay = parseInt($target.text(), 10);
          this.date = new Date(viewYear, viewMonth, viewDay, 0, 0, 0, 0);
          this.viewDate = new Date(viewYear, viewMonth, viewDay, 0, 0, 0, 0);
          this.fillDays();

          if (type === 'day') {
            this.hideView();
          }

          this.change();
          break;

        case 'day selected':
          this.hideView();
          this.change();
          break;

        case 'day disabled':
          this.hideView();
          break;

        // No default
      }
    },

    destroy: function () {
      this.unbind();
      this.$picker.remove();
      this.$element.removeData(NAMESPACE);
    }
  };

  Datepicker.DEFAULTS = {
    date: false,
    dateFormat: 'mm/dd/yyyy',
    disabledClass: 'disabled',
    selectedClass: 'selected',
    autoClose: false,
    inline: false,
    trigger: false,
    container: false,
    showMonthAfterYear: false,
    zIndex: 1,
    viewStart: 0, // 0 for 'days', 1 for 'months', 2 for 'years'
    weekStart: 0, // 0 for Sunday, 1 for Monday, 2 for Tuesday, 3 for Wednesday, 4 for Thursday, 5 for Friday, 6 for Saturday
    yearSuffix: '',
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    daysMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    itemTag: 'li',
    template: (
      '<div class="datepicker-container" data-type="datepicker">' +
        '<div class="datepicker-arrow"></div>' +
        '<div class="datepicker-content">' +
          '<div class="content-years" data-type="years picker">' +
            '<ul class="datepicker-title">' +
              '<li class="datepicker-prev" data-type="years prev">&lsaquo;</li>' +
              '<li class="col-5" data-type="years current"></li>' +
              '<li class="datepicker-next" data-type="years next">&rsaquo;</li>' +
            '</ul>' +
            '<ul class="datepicker-years" data-type="years"></ul>' +
          '</div>' +
          '<div class="content-months" data-type="months picker">' +
            '<ul class="datepicker-title">' +
              '<li class="datepicker-prev" data-type="year prev">&lsaquo;</li>' +
              '<li class="col-5" data-type="year current"></li>' +
              '<li class="datepicker-next" data-type="year next">&rsaquo;</li>' +
            '</ul>' +
            '<ul class="datepicker-months" data-type="months"></ul>' +
          '</div>' +
          '<div class="content-days" data-type="days picker">' +
            '<ul class="datepicker-title">' +
              '<li class="datepicker-prev" data-type="month prev">&lsaquo;</li>' +
              '<li class="col-5" data-type="month current"></li>' +
              '<li class="datepicker-next" data-type="month next">&rsaquo;</li>' +
            '</ul>' +
            '<ul class="datepicker-week" data-type="week"></ul>' +
            '<ul class="datepicker-days" data-type="days"></ul>' +
          '</div>' +
        '</div>' +
      '</div>'
    ),

    isDisabled: function (/*date*/) {
      return false;
    }
  };

  Datepicker.setDefaults = function (options) {
    $.extend(Datepicker.DEFAULTS, $.isPlainObject(options) && options);
  };

  // Save the other datepicker
  Datepicker.other = $.fn.datepicker;

  // Register as jQuery plugin
  $.fn.datepicker = function (options) {
    var args = [].slice.call(arguments, 1);
    var result;

    this.each(function () {
      var $this = $(this);
      var data = $this.data(NAMESPACE);
      var fn;

      if (!data) {
        if (/destroy/.test(options)) {
          return;
        }

        $this.data(NAMESPACE, (data = new Datepicker(this, options)));
      }

      if (typeof options === 'string' && $.isFunction(fn = data[options])) {
        result = fn.apply(data, args);
      }
    });

    return typeof result === 'undefined' ? this : result;
  };

  $.fn.datepicker.Constructor = Datepicker;
  $.fn.datepicker.setDefaults = Datepicker.setDefaults;

  // No conflict
  $.fn.datepicker.noConflict = function () {
    $.fn.datepicker = Datepicker.other;
    return this;
  };

});

(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as anonymous module.
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    // Node / CommonJS
    factory(require('jquery'));
  } else {
    // Browser globals.
    factory(jQuery);
  }
})(function ($) {

  'use strict';

  $(function () {
    $(document).on('click.qor.alert', '[data-dismiss="alert"]', function () {
      $(this).closest('.qor-alert').remove();
    });

    setTimeout(function () {
      $('.qor-alert[data-dismissible="true"]').remove();
    }, 3000);
  });

});

(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as anonymous module.
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    // Node / CommonJS
    factory(require('jquery'));
  } else {
    // Browser globals.
    factory(jQuery);
  }
})(function ($) {

  'use strict';

  var NAMESPACE = 'qor.chooser';
  var EVENT_ENABLE = 'enable.' + NAMESPACE;
  var EVENT_DISABLE = 'disable.' + NAMESPACE;

  function QorChooser(element, options) {
    this.$element = $(element);
    this.options = $.extend({}, QorChooser.DEFAULTS, $.isPlainObject(options) && options);
    this.init();
  }

  QorChooser.prototype = {
    constructor: QorChooser,

    init: function () {
      var $this = this.$element;

      if (!$this.prop('multiple')) {
        if ($this.children('[selected]').length) {
          $this.prepend('<option value=""></option>');
        } else {
          $this.prepend('<option value="" selected></option>');
        }
      }

      $this.chosen({
        // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
        allow_single_deselect: true,
        disable_search_threshold: 10,
        width: '100%'
      });
    },

    destroy: function () {
      this.$element.chosen('destroy');
    },
  };

  QorChooser.DEFAULTS = {};

  QorChooser.plugin = function (options) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data(NAMESPACE);
      var fn;

      if (!data) {
        if (!$.fn.chosen) {
          return;
        }

        if (/destroy/.test(options)) {
          return;
        }

        $this.data(NAMESPACE, (data = new QorChooser(this, options)));
      }

      if (typeof options === 'string' && $.isFunction(fn = data[options])) {
        fn.apply(data);
      }
    });
  };

  $(function () {
    var selector = 'select[data-toggle="qor.chooser"]';

    $(document)
      .on(EVENT_DISABLE, function (e) {
        QorChooser.plugin.call($(selector, e.target), 'destroy');
      })
      .on(EVENT_ENABLE, function (e) {
        QorChooser.plugin.call($(selector, e.target));
      })
      .triggerHandler(EVENT_ENABLE);
  });

  return QorChooser;

});

(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as anonymous module.
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    // Node / CommonJS
    factory(require('jquery'));
  } else {
    // Browser globals.
    factory(jQuery);
  }
})(function ($) {

  'use strict';

  $(document).on('click.qor.confirmer', '[data-confirm]', function (e) {
    var $this = $(this);
    var data = $this.data();
    var url;

    if (data.confirm) {
      if (window.confirm(data.confirm)) {
        if (/DELETE/i.test(data.method)) {
          e.preventDefault();

          url = data.url || $this.attr('href');
          data = $.extend({}, data, {
            _method: 'DELETE'
          });

          $.post(url, data, function () {
            window.location.reload();
          });

        }
      } else {
        e.preventDefault();
      }
    }
  });

});

(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as anonymous module.
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    // Node / CommonJS
    factory(require('jquery'));
  } else {
    // Browser globals.
    factory(jQuery);
  }
})(function ($) {

  'use strict';

  var URL = window.URL || window.webkitURL;
  var NAMESPACE = 'qor.cropper';

  // Events
  var EVENT_ENABLE = 'enable.' + NAMESPACE;
  var EVENT_DISABLE = 'disable.' + NAMESPACE;
  var EVENT_CHANGE = 'change.' + NAMESPACE;
  var EVENT_CLICK = 'click.' + NAMESPACE;
  var EVENT_SHOWN = 'shown.bs.modal';
  var EVENT_HIDDEN = 'hidden.bs.modal';

  // Classes
  var CLASS_TOGGLE = '.qor-cropper-toggle';
  var CLASS_CANVAS = '.qor-cropper-canvas';
  var CLASS_CONTAINER = '.qor-cropper-container';
  var CLASS_OPTIONBOX = '.qor-cropper-optionbox';
  var CLASS_SAVE = '.qor-cropper-save';

  // RegExps
  var REGEXP_OPTIONS = /x|y|width|height/;

  function capitalize (str) {
    if (typeof str === 'string') {
      str = str.charAt(0).toUpperCase() + str.substr(1);
    }

    return str;
  }

  function getLowerCaseKeyObject (obj) {
    var newObj = {};
    var key;

    if ($.isPlainObject(obj)) {
      for (key in obj) {
        if (obj.hasOwnProperty(key)) {
          newObj[String(key).toLowerCase()] = obj[key];
        }
      }
    }

    return newObj;
  }

  /*function getCapitalizeKeyObject (obj) {
    var newObj = {};
    var key;

    if ($.isPlainObject(obj)) {
      for (key in obj) {
        if (obj.hasOwnProperty(key)) {
          newObj[capitalize(key)] = obj[key];
        }
      }
    }

    return newObj;
  }*/

  function getValueByNoCaseKey (obj, key) {
    var originalKey = String(key);
    var lowerCaseKey = originalKey.toLowerCase();
    var upperCaseKey = originalKey.toUpperCase();
    var capitalizeKey = capitalize(originalKey);

    if ($.isPlainObject(obj)) {
      return (obj[lowerCaseKey] || obj[capitalizeKey] || obj[upperCaseKey]);
    }
  }

  function QorCropper(element, options) {
    this.$element = $(element);
    this.options = $.extend(true, {}, QorCropper.DEFAULTS, $.isPlainObject(options) && options);
    this.data = null;
    this.init();
  }

  QorCropper.prototype = {
    constructor: QorCropper,

    init: function () {
      var options = this.options;
      var $this = this.$element;
      var $parent = $this.closest(options.parent);
      var $list;
      var data;

      if (!$parent.length) {
        $parent = $this.parent();
      }

      this.$parent = $parent;
      this.$output = $parent.find(options.output);
      this.$list = $list = $parent.find(options.list);

      if (!$list.find('img').attr('src')) {
        $list.find('ul').hide();
      }

      try {
        data = JSON.parse($.trim(this.$output.val()));
      } catch (e) {}

      this.data = data || {};
      this.build();
      this.bind();
    },

    build: function () {
      this.wrap();
      this.$modal = $(QorCropper.MODAL).appendTo('body');
    },

    unbuild: function () {
      this.unwrap();
      this.$modal.remove();
    },

    wrap: function () {
      var $list = this.$list;
      var $img;

      $list.find('li').append(QorCropper.TOGGLE);
      $img = $list.find('img');
      $img.wrap(QorCropper.CANVAS);
      this.center($img);
    },

    unwrap: function () {
      var $list = this.$list;

      $list.find(CLASS_TOGGLE).remove();
      $list.find(CLASS_CANVAS).each(function () {
        var $this = $(this);

        $this.before($this.html()).remove();
      });
    },

    bind: function () {
      this.$element.
        on(EVENT_CHANGE, $.proxy(this.read, this));

      this.$list.
        on(EVENT_CLICK, $.proxy(this.click, this));

      this.$modal.
        on(EVENT_SHOWN, $.proxy(this.start, this)).
        on(EVENT_HIDDEN, $.proxy(this.stop, this));
    },

    unbind: function () {
      this.$element.
        off(EVENT_CHANGE, this.read);

      this.$list.
        off(EVENT_CLICK, this.click);

      this.$modal.
        off(EVENT_SHOWN, this.start).
        off(EVENT_HIDDEN, this.stop);
    },

    click: function (e) {
      var target = e.target;
      var $target;

      if (target === this.$list[0]) {
        return;
      }

      $target = $(target);

      if (!$target.is('img')) {
        $target = $target.closest('li').find('img');
      }

      this.$target = $target;
      this.$modal.modal('show');
    },

    read: function (e) {
      var files = e.target.files;
      var file;

      if (files && files.length) {
        file = files[0];

        if (/^image\/\w+$/.test(file.type) && URL) {
          this.load(URL.createObjectURL(file));
        } else {
          this.$list.empty().text(file.name);
        }
      }
    },

    load: function (url) {
      var options = this.options;
      var _this = this;
      var $list = this.$list;
      var $ul = $list.find('ul');
      var data = this.data;
      var $image;

      if (!$ul.length) {
        $ul  = $(QorCropper.LIST);
        $list.html($ul);
        this.wrap();
      }

      if ($ul.is(':hidden')) {
        $ul.show();
      }

      $image = $list.find('img');
      $image.one('load', function () {
        var naturalWidth = this.naturalWidth;
        var naturalHeight = this.naturalHeight;
        var sizeData = $(this).data();
        var sizeResolution = sizeData.sizeResolution;
        var sizeName = sizeData.sizeName;
        var emulateImageData = {};
        var emulateCropData = {};
        var aspectRatio;
        var width;
        var height;

        if (sizeResolution) {
          width = getValueByNoCaseKey(sizeResolution, 'width');
          height = getValueByNoCaseKey(sizeResolution, 'height');
          aspectRatio = width / height;

          if (naturalHeight * aspectRatio > naturalWidth) {
            width = naturalWidth;
            height = width / aspectRatio;
          } else {
            height = naturalHeight;
            width = height * aspectRatio;
          }

          width *= 0.8;
          height *= 0.8;

          emulateImageData = {
            naturalWidth: naturalWidth,
            naturalHeight: naturalHeight,
          };

          emulateCropData = {
            x: (naturalWidth - width) / 2,
            y: (naturalHeight - height) / 2,
            width: width,
            height: height,
          };

          _this.preview($image, emulateImageData, emulateCropData);

          if (sizeName) {
            data.crop = true;

            if (!data[options.key]) {
              data[options.key] = {};
            }

            data[options.key][sizeName] = emulateCropData;
          }
        } else {
          _this.center($image);
        }

        _this.$output.val(JSON.stringify(data));
      }).attr('src', url).data('originalUrl', url);
    },

    start: function () {
      var options = this.options;
      var $modal = this.$modal;
      var $target = this.$target;
      var sizeData = $target.data();
      var sizeName = sizeData.sizeName || 'original';
      var sizeResolution = sizeData.sizeResolution;
      var $clone = $('<img>').attr('src', sizeData.originalUrl);
      var data = this.data;
      var _this = this;
      var sizeAspectRatio = NaN;
      var sizeWidth;
      var sizeHeight;
      var list;

      if (sizeResolution) {
        sizeWidth = getValueByNoCaseKey(sizeResolution, 'width');
        sizeHeight = getValueByNoCaseKey(sizeResolution, 'height');
        sizeAspectRatio = sizeWidth / sizeHeight;
      }

      if (!data[options.key]) {
        data[options.key] = {};
      }

      $modal.find(CLASS_CONTAINER).html($clone);

      list = this.getList(sizeAspectRatio);

      if (list) {
        $modal.find(CLASS_OPTIONBOX).show().find('ul').html(list);
      }

      $clone.cropper({
        aspectRatio: sizeAspectRatio,
        data: getLowerCaseKeyObject(data[options.key][sizeName]),
        background: false,
        movable: false,
        zoomable: false,
        rotatable: false,
        checkImageOrigin: false,

        built: function () {
          $modal.find(CLASS_SAVE).one('click', function () {
            var cropData = {};
            var syncData = [];
            var url;

            $.each($clone.cropper('getData'), function (i, n) {
              if (REGEXP_OPTIONS.test(i)) {
                cropData[i] = Math.round(n);
              }
            });

            data.crop = true;
            data[options.key][sizeName] = cropData;
            _this.imageData = $clone.cropper('getImageData');
            _this.cropData = cropData;

            try {
              url = $clone.cropper('getCroppedCanvas').toDataURL();
            } catch (e) {}

            $modal.find(CLASS_OPTIONBOX + ' input').each(function () {
              var $this = $(this);

              if ($this.prop('checked')) {
                syncData.push($this.attr('name'));
              }
            });

            _this.output(url, syncData);
            $modal.modal('hide');
          });
        },
      });
    },

    stop: function () {
      this.$modal.
        find(CLASS_CONTAINER + ' > img').
          cropper('destroy').
          remove().
          end().
        find(CLASS_OPTIONBOX).
          hide().
          find('ul').
            empty();
    },

    getList: function (aspectRatio) {
      var list = [];

      this.$list.find('img').not(this.$target).each(function () {
        var data = $(this).data();
        var resolution = data.sizeResolution;
        var name = data.sizeName;
        var width;
        var height;

        if (resolution) {
          width = getValueByNoCaseKey(resolution, 'width');
          height = getValueByNoCaseKey(resolution, 'height');

          if (width / height === aspectRatio) {
            list.push(
              '<label>' +
                '<input type="checkbox" name="' + name + '" checked> ' +
                '<span>' + name +
                  '<small>(' + width + '&times;' + height + ' px)</small>' +
                '</span>' +
              '</label>'
            );
          }
        }
      });

      return list.length ? ('<li>' + list.join('</li><li>') + '</li>') : '';
    },

    output: function (url, data) {
      var $target = this.$target;

      if (url) {
        this.center($target.attr('src', url));
      } else {
        this.preview($target);
      }

      if ($.isArray(data) && data.length) {
        this.autoCrop(url, data);
      }

      this.$output.val(JSON.stringify(this.data));
    },

    preview: function ($target, emulateImageData, emulateCropData) {
      var $canvas = $target.parent();
      var $container = $canvas.parent();

      // minContainerWidth: 160, minContainerHeight: 160
      var containerWidth = Math.max($container.width(), 160);
      var containerHeight = Math.max($container.height(), 160);
      var imageData = emulateImageData || this.imageData;

      // Clone one to avoid changing it
      var cropData = $.extend({}, emulateCropData || this.cropData);
      var cropAspectRatio = cropData.width / cropData.height;
      var newWidth = containerWidth;
      var newHeight = containerHeight;
      var newRatio;

      if (containerHeight * cropAspectRatio > containerWidth) {
        newHeight = newWidth / cropAspectRatio;
      } else {
        newWidth = newHeight * cropAspectRatio;
      }

      newRatio = cropData.width / newWidth;

      $.each(cropData, function (i, n) {
        cropData[i] = n / newRatio;
      });

      $canvas.css({
        width: cropData.width,
        height: cropData.height,
      });

      $target.css({
        width: imageData.naturalWidth / newRatio,
        height: imageData.naturalHeight / newRatio,
        maxWidth: 'none',
        maxHeight: 'none',
        marginLeft: -cropData.x,
        marginTop: -cropData.y,
      });

      this.center($target);
    },

    center: function ($target, reset) {
      $target.each(function () {
        var $this = $(this);
        var $canvas = $this.parent();
        var $container = $canvas.parent();

        function center() {
          var containerHeight = $container.height();
          var canvasHeight = $canvas.height();
          var marginTop = 'auto';

          if (canvasHeight < containerHeight) {
            marginTop = (containerHeight - canvasHeight) / 2;
          }

          $canvas.css('margin-top', marginTop);
        }

        if (reset) {
          $canvas.removeAttr('style');
        }

        if (this.complete) {
          center.call(this);
        } else {
          this.onload = center;
        }
      });
    },

    autoCrop: function (url, data) {
      var cropData = this.cropData;
      var cropOptions = this.data[this.options.key];
      var _this = this;

      this.$list.find('img').not(this.$target).each(function () {
        var $this = $(this);
        var sizeName = $this.data('sizeName');

        if ($.inArray(sizeName, data) > -1) {
          cropOptions[sizeName] = $.extend({}, cropData);

          if (url) {
            _this.center($this.attr('src', url));
          } else {
            _this.preview($this);
          }
        }
      });
    },

    destroy: function () {
      this.unbind();
      this.unbuild();
      this.$element.removeData(NAMESPACE);
    },
  };

  QorCropper.DEFAULTS = {
    parent: false,
    output: false,
    list: false,
    key: 'data',
    data: null,
  };

  QorCropper.TOGGLE = '<div class="qor-cropper-toggle"></div>';
  QorCropper.CANVAS = '<div class="qor-cropper-canvas"></div>';
  QorCropper.LIST = '<ul><li><img></li></ul>';
  QorCropper.MODAL = (
    '<div class="qor-modal fade qor-modal--cropper" tabindex="-1" role="dialog" aria-hidden="true">' +
      '<div class="mdl-card mdl-shadow--2dp" role="document">' +
        '<div class="mdl-card__title">' +
          '<h2 class="mdl-card__title-text">Crop the image</h2>' +
        '</div>' +
        '<div class="mdl-card__supporting-text">' +
          '<div class="qor-cropper-container"></div>' +
          '<div class="qor-cropper-optionbox">' +
            '<h5>Sync cropping result to:</h5>' +
            '<ul></ul>' +
          '</div>' +
        '</div>' +
        '<div class="mdl-card__actions mdl-card--border">' +
          '<a class="mdl-button mdl-button-colored mdl-js-button mdl-js-ripple-effect qor-cropper-save">OK</a>' +
          '<a class="mdl-button mdl-js-button mdl-js-ripple-effect" data-dismiss="modal">Cancel</a>' +
        '</div>' +
        '<div class="mdl-card__menu">' +
          '<button class="mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect" data-dismiss="modal" aria-label="close">' +
            '<i class="material-icons">close</i>' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );

  QorCropper.plugin = function (options) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data(NAMESPACE);
      var fn;

      if (!data) {
        if (!$.fn.cropper) {
          return;
        }

        if (/destroy/.test(options)) {
          return;
        }

        $this.data(NAMESPACE, (data = new QorCropper(this, options)));
      }

      if (typeof options === 'string' && $.isFunction(fn = data[options])) {
        fn.apply(data);
      }
    });
  };

  $(function () {
    var selector = '.qor-file-input';
    var options = {
          parent: '.form-group',
          output: '.qor-file-options',
          list: '.qor-file-list',
          key: 'CropOptions',
        };

    $(document)
      .on(EVENT_CLICK, selector, function () {
        QorCropper.plugin.call($(this), options);
      })
      .on(EVENT_DISABLE, function (e) {
        QorCropper.plugin.call($(selector, e.target), 'destroy');
      })
      .on(EVENT_ENABLE, function (e) {
        QorCropper.plugin.call($(selector, e.target), options);
      })
      .triggerHandler(EVENT_ENABLE);
  });

  return QorCropper;

});

(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as anonymous module.
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    // Node / CommonJS
    factory(require('jquery'));
  } else {
    // Browser globals.
    factory(jQuery);
  }
})(function ($) {

  'use strict';

  var NAMESPACE = 'qor.datepicker';
  var EVENT_ENABLE = 'enable.' + NAMESPACE;
  var EVENT_DISABLE = 'disable.' + NAMESPACE;
  var EVENT_CHANGE = 'change.' + NAMESPACE;
  var EVENT_CLICK = 'click.' + NAMESPACE;

  var CLASS_EMBEDDED = '.qor-datepicker-embedded';
  var CLASS_SAVE = '.qor-datepicker-save';

  function QorDatepicker(element, options) {
    this.$element = $(element);
    this.options = $.extend({}, QorDatepicker.DEFAULTS, $.isPlainObject(options) && options);
    this.date = null;
    this.formatDate = null;
    this.built = false;
    this.init();
  }

  QorDatepicker.prototype = {
    init: function () {
      this.bind();
    },

    bind: function () {
      this.$element.on(EVENT_CLICK, $.proxy(this.show, this));
    },

    unbind: function () {
      this.$element.off(EVENT_CLICK, this.show);
    },

    build: function () {
      var $modal;

      if (this.built) {
        return;
      }

      this.$modal = $modal = $(QorDatepicker.TEMPLATE).appendTo('body');

      $modal.
        find(CLASS_EMBEDDED).
          on(EVENT_CHANGE, $.proxy(this.change, this)).
          datepicker({
            date: this.$element.val(),
            dateFormat: 'yyyy-mm-dd',
            inline: true,
          }).
          triggerHandler(EVENT_CHANGE);

      $modal.
        find(CLASS_SAVE).
          on(EVENT_CLICK, $.proxy(this.pick, this));

      this.built = true;
    },

    unbuild: function () {
      if (!this.built) {
        return;
      }

      this.$modal.
        find(CLASS_EMBEDDED).
          off(EVENT_CHANGE, this.change).
          datepicker('destroy').
          end().
        find(CLASS_SAVE).
          off(EVENT_CLICK, this.pick).
          end().
        remove();
    },

    change: function (e) {
      var $modal = this.$modal;
      var $target = $(e.target);
      var date;

      this.date = date = $target.datepicker('getDate');
      this.formatDate = $target.datepicker('getDate', true);

      $modal.find('.qor-datepicker-year').text(date.getFullYear());
      $modal.find('.qor-datepicker-month').text(String($target.datepicker('getMonthByNumber', date.getMonth(), true)).toUpperCase());
      $modal.find('.qor-datepicker-week').text($target.datepicker('getDayByNumber', date.getDay()));
      $modal.find('.qor-datepicker-day').text(date.getDate());
    },

    show: function () {
      if (!this.built) {
        this.build();
      }

      this.$modal.modal('show');
    },

    pick: function () {
      this.$element.val(this.formatDate);
      this.$modal.modal('hide');
    },

    destroy: function () {
      this.unbind();
      this.unbuild();
      this.$element.removeData(NAMESPACE);
    },
  };

  QorDatepicker.DEFAULTS = {};

  QorDatepicker.TEMPLATE = (
     '<div class="qor-modal fade qor-datepicker-modal" tabindex="-1" role="dialog" aria-hidden="true">' +
      '<div class="mdl-card mdl-shadow--2dp" role="document">' +
        '<div class="mdl-card__title">' +
          '<h2 class="mdl-card__title-text">Pick a date</h2>' +
        '</div>' +
        '<div class="mdl-card__supporting-text">' +
          '<div class="qor-datepicker-picked">' +
            '<div class="qor-datepicker-week"></div>' +
            '<div class="qor-datepicker-month"></div>' +
            '<div class="qor-datepicker-day"></div>' +
            '<div class="qor-datepicker-year"></div>' +
          '</div>' +
          '<div class="qor-datepicker-embedded"></div>' +
        '</div>' +
        '<div class="mdl-card__actions mdl-card--border">' +
          '<a class="mdl-button mdl-button-colored mdl-js-button mdl-js-ripple-effect qor-datepicker-save">OK</a>' +
          '<a class="mdl-button mdl-js-button mdl-js-ripple-effect" data-dismiss="modal">Cancel</a>' +
        '</div>' +
      '</div>' +
    '</div>'
  );

  QorDatepicker.plugin = function (options) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data(NAMESPACE);
      var fn;

      if (!data) {
        if (!$.fn.datepicker) {
          return;
        }

        if (/destroy/.test(options)) {
          return;
        }

        $this.data(NAMESPACE, (data = new QorDatepicker(this, options)));
      }

      if (typeof options === 'string' && $.isFunction(fn = data[options])) {
        fn.apply(data);
      }
    });
  };

  $(function () {
    var selector = '[data-toggle="qor.datepicker"]';

    $(document)
      .on(EVENT_CLICK, selector, function () {
        QorDatepicker.plugin.call($(this));
      })
      .on(EVENT_DISABLE, function (e) {
        QorDatepicker.plugin.call($(selector, e.target), 'destroy');
      })
      .on(EVENT_ENABLE, function (e) {
        QorDatepicker.plugin.call($(selector, e.target));
      })
      .triggerHandler(EVENT_ENABLE);
  });

  return QorDatepicker;

});

(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as anonymous module.
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    // Node / CommonJS
    factory(require('jquery'));
  } else {
    // Browser globals.
    factory(jQuery);
  }
})(function ($) {

  'use strict';

  var location = window.location;
  var NAMESPACE = 'qor.filter';
  var EVENT_ENABLE = 'enable.' + NAMESPACE;
  var EVENT_DISABLE = 'disable.' + NAMESPACE;
  var EVENT_CLICK = 'click.' + NAMESPACE;
  var EVENT_CHANGE = 'change.' + NAMESPACE;

  function QorFilter(element, options) {
    this.$element = $(element);
    this.options = $.extend({}, QorFilter.DEFAULTS, $.isPlainObject(options) && options);
    this.init();
  }

  function encodeSearch(data, detached) {
    var search = location.search;
    var params;

    if ($.isArray(data)) {
      params = decodeSearch(search);

      $.each(data, function (i, param) {
        i = $.inArray(param, params);

        if (i === -1) {
          params.push(param);
        } else if (detached) {
          params.splice(i, 1);
        }
      });

      search = '?' + params.join('&');
    }

    return search;
  }

  function decodeSearch(search) {
    var data = [];

    if (search && search.indexOf('?') > -1) {
      search = search.split('?')[1];

      if (search && search.indexOf('#') > -1) {
        search = search.split('#')[0];
      }

      if (search) {
        // search = search.toLowerCase();
        data = $.map(search.split('&'), function (n) {
          var param = [];
          var value;

          n = n.split('=');
          value = n[1];
          param.push(n[0]);

          if (value) {
            value = $.trim(decodeURIComponent(value));

            if (value) {
              param.push(value);
            }
          }

          return param.join('=');
        });
      }
    }

    return data;
  }

  QorFilter.prototype = {
    constructor: QorFilter,

    init: function () {
      // this.parse();
      this.bind();
    },

    bind: function () {
      var options = this.options;

      this.$element.
        on(EVENT_CLICK, options.label, $.proxy(this.toggle, this)).
        on(EVENT_CHANGE, options.group, $.proxy(this.toggle, this));
    },

    unbind: function () {
      this.$element.
        off(EVENT_CLICK, this.toggle).
        off(EVENT_CHANGE, this.toggle);
    },

    /*parse: function () {
      var options = this.options;
      var $this = this.$element;
      var params = decodeSearch(location.search);

      $this.find(options.label).each(function () {
        var $this = $(this);

        $.each(decodeSearch($this.attr('href')), function (i, param) {
          var matched = $.inArray(param, params) > -1;

          $this.toggleClass('active', matched);

          if (matched) {
            return false;
          }
        });
      });

      $this.find(options.group).each(function () {
        var $this = $(this);
        var name = $this.attr('name');

        $this.find('option').each(function () {
          var $this = $(this),
              param = [name, $this.prop('value')].join('=');

          if ($.inArray(param, params) > -1) {
            $this.attr('selected', true);
            return false;
          }
        });
      });
    },*/

    toggle: function (e) {
      var $target = $(e.currentTarget);
      var data = {};
      var params;
      var param;
      var search;
      var name;
      var value;
      var index;
      var matched;

      if ($target.is('select')) {
        params = decodeSearch(location.search);
        name = $target.attr('name');
        value = $target.val();

        param = [name];

        if (value) {
          param.push(value);
        }

        param = param.join('=');
        data = [param];

        $target.children().each(function () {
          var $this = $(this);
          var param = [name];
          var value = $.trim($this.prop('value'));

          if (value) {
            param.push(value);
          }

          param = param.join('=');
          index = $.inArray(param, params);

          if (index > -1) {
            matched = param;
            return false;
          }
        });

        if (matched) {
          data.push(matched);
          search = encodeSearch(data, true);
        } else {
          search = encodeSearch(data);
        }
      } else if ($target.is('a')) {
        e.preventDefault();
        data = decodeSearch($target.attr('href'));

        if ($target.hasClass('active')) {
          search = encodeSearch(data, true); // set `true` to detach
        } else {
          search = encodeSearch(data);
        }
      }

      location.search = search;
    },

    destroy: function () {
      this.unbind();
      this.$element.removeData(NAMESPACE);
    },
  };

  QorFilter.DEFAULTS = {
    label: false,
    group: false
  };

  QorFilter.plugin = function (options) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data(NAMESPACE);
      var fn;

      if (!data) {
        if (/destroy/.test(options)) {
          return;
        }

        $this.data(NAMESPACE, (data = new QorFilter(this, options)));
      }

      if (typeof options === 'string' && $.isFunction(fn = data[options])) {
        fn.apply(data);
      }
    });
  };

  $(function () {
    var selector = '[data-toggle="qor.filter"]';
    var options = {
          label: '.qor-label',
          group: '.qor-label-group',
        };

    $(document)
      .on(EVENT_DISABLE, function (e) {
        QorFilter.plugin.call($(selector, e.target), 'destroy');
      })
      .on(EVENT_ENABLE, function (e) {
        QorFilter.plugin.call($(selector, e.target), options);
      })
      .triggerHandler(EVENT_ENABLE);
  });

  return QorFilter;

});

(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as anonymous module.
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    // Node / CommonJS
    factory(require('jquery'));
  } else {
    // Browser globals.
    factory(jQuery);
  }
})(function ($) {

  'use strict';

  var $window = $(window);
  var NAMESPACE = 'qor.fixer';
  var EVENT_ENABLE = 'enable.' + NAMESPACE;
  var EVENT_DISABLE = 'disable.' + NAMESPACE;
  var EVENT_RESIZE = 'resize.' + NAMESPACE;
  var EVENT_SCROLL = 'scroll.' + NAMESPACE;

  function QorFixer(element, options) {
    this.$element = $(element);
    this.options = $.extend({}, QorFixer.DEFAULTS, $.isPlainObject(options) && options);
    this.$clone = null;
    this.init();
  }

  QorFixer.prototype = {
    constructor: QorFixer,

    init: function () {
      var $this = this.$element;

      if ($this.is(':hidden') || $this.find('tbody > tr:visible').length <= 1) {
        return;
      }

      this.$thead = $this.find('thead:first');
      this.$tbody = $this.find('tbody:first');
      this.$tfoot = $this.find('tfoot:first');

      this.resize();
      this.bind();
    },

    bind: function () {
      $window
        .on(EVENT_SCROLL, $.proxy(this.toggle, this))
        .on(EVENT_RESIZE, $.proxy(this.resize, this));
    },

    unbind: function () {
      $window
        .off(EVENT_SCROLL, this.toggle)
        .off(EVENT_RESIZE, this.resize);
    },

    build: function () {
      var $this = this.$element;
      var $thead = this.$thead;
      var $clone = this.$clone;
      var $items = $thead.find('> tr').children();

      if (!$clone) {
        this.$clone = $clone = $thead.clone().prependTo($this);
      }

      $clone.
        css({
          position: 'fixed',
          top: 0,
          zIndex: 1,
          display: 'none',
          width: $thead.width()
        }).
        find('> tr').
          children().
            each(function (i) {
              $(this).width($items.eq(i).width());
            });
    },

    unbuild: function () {
      this.$clone.remove();
    },

    toggle: function () {
      var $this = this.$element;
      var $clone = this.$clone;
      var offset = $this.offset();
      var top = $window.scrollTop() - offset.top;
      var theadHeight = this.$thead.height();
      var tbodyHeight = this.$tbody.find('> tr:last').height();
      var tfootHeight = this.$tfoot.height();
      var maxTop = $this.outerHeight() - theadHeight - tbodyHeight - tfootHeight;

      if (top > 0 && top < maxTop) {
        $clone.show();
      } else {
        $clone.hide();
      }
    },

    resize: function () {
      this.build();
      this.toggle();
    },

    destroy: function () {
      this.unbind();
      this.unbuild();
      this.$element.removeData(NAMESPACE);
    },
  };

  QorFixer.DEFAULTS = {};

  QorFixer.plugin = function (options) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data(NAMESPACE);
      var fn;

      if (!data) {
        $this.data(NAMESPACE, (data = new QorFixer(this, options)));
      }

      if (typeof options === 'string' && $.isFunction(fn = data[options])) {
        fn.call(data);
      }
    });
  };

  $(function () {
    var selector = '.qor-list';

    $(document)
      .on(EVENT_DISABLE, function (e) {
        QorFixer.plugin.call($(selector, e.target), 'destroy');
      })
      .on(EVENT_ENABLE, function (e) {
        QorFixer.plugin.call($(selector, e.target));
      })
      .triggerHandler(EVENT_ENABLE);
  });

  return QorFixer;

});

(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as anonymous module.
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    // Node / CommonJS
    factory(require('jquery'));
  } else {
    // Browser globals.
    factory(jQuery);
  }
})(function ($) {

  'use strict';

  var $document = $(document);
  var NAMESPACE = 'qor.modal';
  var EVENT_ENABLE = 'enable.' + NAMESPACE;
  var EVENT_DISABLE = 'disable.' + NAMESPACE;
  var EVENT_CLICK = 'click.' + NAMESPACE;
  var EVENT_KEYUP = 'keyup.' + NAMESPACE;
  var EVENT_SHOW = 'show.' + NAMESPACE;
  var EVENT_SHOWN = 'shown.' + NAMESPACE;
  var EVENT_HIDE = 'hide.' + NAMESPACE;
  var EVENT_HIDDEN = 'hidden.' + NAMESPACE;
  var EVENT_TRANSITION_END = 'transitionend';
  var CLASS_OPEN = 'qor-modal-open';
  var CLASS_SHOWN = 'shown';
  var CLASS_FADE = 'fade';
  var CLASS_IN = 'in';
  var ARIA_HIDDEN = 'aria-hidden';

  function QorModal(element, options) {
    this.$element = $(element);
    this.options = $.extend({}, QorModal.DEFAULTS, $.isPlainObject(options) && options);
    this.transitioning = false;
    this.fadable = false;
    this.init();
  }

  QorModal.prototype = {
    constructor: QorModal,

    init: function () {
      this.fadable = this.$element.hasClass(CLASS_FADE);

      if (this.options.show) {
        this.show();
      } else {
        this.toggle();
      }
    },

    bind: function () {
      this.$element.on(EVENT_CLICK, $.proxy(this.click, this));

      if (this.options.keyboard) {
        $document.on(EVENT_KEYUP, $.proxy(this.keyup, this));
      }
    },

    unbind: function () {
      this.$element.off(EVENT_CLICK, this.click);

      if (this.options.keyboard) {
        $document.off(EVENT_KEYUP, this.keyup);
      }
    },

    click: function (e) {
      var element = this.$element[0];
      var target = e.target;

      if (target === element && this.options.backdrop) {
        this.hide();
        return;
      }

      while (target !== element) {
        if ($(target).data('dismiss') === 'modal') {
          this.hide();
          break;
        }

        target = target.parentNode;
      }
    },

    keyup: function (e) {
      if (e.which === 27) {
        this.hide();
      }
    },

    show: function (noTransition) {
      var $this = this.$element,
          showEvent;

      if (this.transitioning || $this.hasClass(CLASS_IN)) {
        return;
      }

      showEvent = $.Event(EVENT_SHOW);
      $this.trigger(showEvent);

      if (showEvent.isDefaultPrevented()) {
        return;
      }

      $document.find('body').addClass(CLASS_OPEN);
      $this.addClass(CLASS_SHOWN).scrollTop(0).get(0).offsetHeight; // reflow for transition
      this.transitioning = true;

      if (noTransition || !this.fadable) {
        $this.addClass(CLASS_IN);
        this.shown();
        return;
      }

      $this.one(EVENT_TRANSITION_END, $.proxy(this.shown, this));
      $this.addClass(CLASS_IN);
    },

    shown: function () {
      this.transitioning = false;
      this.bind();
      this.$element.attr(ARIA_HIDDEN, false).trigger(EVENT_SHOWN).focus();
    },

    hide: function (noTransition) {
      var $this = this.$element,
          hideEvent;

      if (this.transitioning || !$this.hasClass(CLASS_IN)) {
        return;
      }

      hideEvent = $.Event(EVENT_HIDE);
      $this.trigger(hideEvent);

      if (hideEvent.isDefaultPrevented()) {
        return;
      }

      $document.find('body').removeClass(CLASS_OPEN);
      this.transitioning = true;

      if (noTransition || !this.fadable) {
        $this.removeClass(CLASS_IN);
        this.hidden();
        return;
      }

      $this.one(EVENT_TRANSITION_END, $.proxy(this.hidden, this));
      $this.removeClass(CLASS_IN);
    },

    hidden: function () {
      this.transitioning = false;
      this.unbind();
      this.$element.removeClass(CLASS_SHOWN).attr(ARIA_HIDDEN, true).trigger(EVENT_HIDDEN);
    },

    toggle: function () {
      if (this.$element.hasClass(CLASS_IN)) {
        this.hide();
      } else {
        this.show();
      }
    },

    destroy: function () {
      this.$element.removeData(NAMESPACE);
    },
  };

  QorModal.DEFAULTS = {
    backdrop: true,
    keyboard: true,
    show: true,
  };

  QorModal.plugin = function (options) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data(NAMESPACE);
      var fn;

      if (!data) {
        if (/destroy/.test(options)) {
          return;
        }

        $this.data(NAMESPACE, (data = new QorModal(this, options)));
      }

      if (typeof options === 'string' && $.isFunction(fn = data[options])) {
        fn.apply(data);
      }
    });
  };

  $.fn.qorModal = QorModal.plugin;

  $(function () {
    var selector = '.qor-modal';

    $(document)
      .on(EVENT_CLICK, '[data-toggle="qor.modal"]', function () {
        var $this = $(this);
        var data = $this.data();
        var $target = $(data.target || $this.attr('href'));

        QorModal.plugin.call($target, $target.data(NAMESPACE) ? 'toggle' : data);
      })
      .on(EVENT_DISABLE, function (e) {
        QorModal.plugin.call($(selector, e.target), 'destroy');
      })
      .on(EVENT_ENABLE, function (e) {
        QorModal.plugin.call($(selector, e.target));
      });
  });

  return QorModal;

});

(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as anonymous module.
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    // Node / CommonJS
    factory(require('jquery'));
  } else {
    // Browser globals.
    factory(jQuery);
  }
})(function ($) {

  'use strict';

  var $window = $(window);
  var NAMESPACE = 'qor.redactor';
  var EVENT_ENABLE = 'enable.' + NAMESPACE;
  var EVENT_DISABLE = 'disable.' + NAMESPACE;
  var EVENT_CLICK = 'click.' + NAMESPACE;
  var EVENT_FOCUS = 'focus.' + NAMESPACE;
  var EVENT_BLUR = 'blur.' + NAMESPACE;
  var EVENT_IMAGE_UPLOAD = 'imageupload.' + NAMESPACE;
  var EVENT_IMAGE_DELETE = 'imagedelete.' + NAMESPACE;
  var REGEXP_OPTIONS = /x|y|width|height/;

  function QorRedactor(element, options) {
    this.$element = $(element);
    this.options = $.extend(true, {}, QorRedactor.DEFAULTS, $.isPlainObject(options) && options);
    this.init();
  }

  function encodeCropData(data) {
    var nums = [];

    if ($.isPlainObject(data)) {
      $.each(data, function () {
        nums.push(arguments[1]);
      });
    }

    return nums.join();
  }

  function decodeCropData(data) {
    var nums = data && data.split(',');

    data = null;

    if (nums && nums.length === 4) {
      data = {
        x: Number(nums[0]),
        y: Number(nums[1]),
        width: Number(nums[2]),
        height: Number(nums[3])
      };
    }

    return data;
  }

  function capitalize (str) {
    if (typeof str === 'string') {
      str = str.charAt(0).toUpperCase() + str.substr(1);
    }

    return str;
  }

  function getCapitalizeKeyObject (obj) {
    var newObj = {},
        key;

    if ($.isPlainObject(obj)) {
      for (key in obj) {
        if (obj.hasOwnProperty(key)) {
          newObj[capitalize(key)] = obj[key];
        }
      }
    }

    return newObj;
  }

  QorRedactor.prototype = {
    constructor: QorRedactor,

    init: function () {
      var options = this.options;
      var $this = this.$element;
      var $parent = $this.closest(options.parent);

      if (!$parent.length) {
        $parent = $this.parent();
      }

      this.$parent = $parent;
      this.$button = $(QorRedactor.BUTTON);
      this.$modal = $(QorRedactor.MODAL).appendTo('body');
      this.bind();
    },

    bind: function () {
      var $parent = this.$parent;
      var click = $.proxy(this.click, this);

      this.$element.
        on(EVENT_IMAGE_UPLOAD, function (e, image) {
          $(image).on(EVENT_CLICK, click);
        }).
        on(EVENT_IMAGE_DELETE, function (e, image) {
          $(image).off(EVENT_CLICK, click);
        }).
        on(EVENT_FOCUS, function () {
          $parent.find('img').off(EVENT_CLICK, click).on(EVENT_CLICK, click);
        }).
        on(EVENT_BLUR, function () {
          $parent.find('img').off(EVENT_CLICK, click);
        });

      $window.on(EVENT_CLICK, $.proxy(this.removeButton, this));
    },

    unbind: function () {
      this.$element.
        off(EVENT_IMAGE_UPLOAD).
        off(EVENT_IMAGE_DELETE).
        off(EVENT_FOCUS).
        off(EVENT_BLUR);

      $window.off(EVENT_CLICK, this.removeButton);
    },

    click: function (e) {
      e.stopPropagation();
      setTimeout($.proxy(this.addButton, this, $(e.target)), 1);
    },

    addButton: function ($image) {
      this.$button.insertBefore($image).off(EVENT_CLICK).one(EVENT_CLICK, $.proxy(this.crop, this, $image));
    },

    removeButton: function () {
      this.$button.off(EVENT_CLICK).detach();
    },

    crop: function ($image) {
      var options = this.options;
      var url = $image.attr('src');
      var originalUrl = url;
      var $clone = $('<img>');
      var $modal = this.$modal;

      if ($.isFunction(options.replace)) {
        originalUrl = options.replace(originalUrl);
      }

      $clone.attr('src', originalUrl);
      $modal.one('shown.bs.modal', function () {
        $clone.cropper({
          data: decodeCropData($image.attr('data-crop-options')),
          background: false,
          movable: false,
          zoomable: false,
          rotatable: false,
          checkImageOrigin: false,

          built: function () {
            $modal.find(options.save).one('click', function () {
              var cropData = {};

              $.each($clone.cropper('getData'), function (i, n) {
                if (REGEXP_OPTIONS.test(i)) {
                  cropData[i] = Math.round(n);
                }
              });

              $.ajax(options.remote, {
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                  Url: url,
                  CropOptions: {
                    original: getCapitalizeKeyObject(cropData)
                  },
                  Crop: true
                }),
                dataType: 'json',

                success: function (response) {
                  if ($.isPlainObject(response) && response.url) {
                    $image.attr('src', response.url).attr('data-crop-options', encodeCropData(cropData)).removeAttr('style').removeAttr('rel');

                    if ($.isFunction(options.complete)) {
                      options.complete();
                    }

                    $modal.qorModal('hide');
                  }
                }
              });
            });
          },
        });
      }).one('hidden.bs.modal', function () {
        $clone.cropper('destroy').remove();
      }).qorModal('show').find('.qor-cropper-container').append($clone);
    },

    destroy: function () {
      this.unbind();
      this.$modal.qorModal('hide').remove();
      this.$element.removeData(NAMESPACE);
    },
  };

  QorRedactor.DEFAULTS = {
    remote: false,
    toggle: false,
    parent: false,
    modal: '.qor-cropper-modal',
    save: '.qor-cropper-save',
    replace: null,
    complete: null,
  };

  QorRedactor.BUTTON = '<span class="redactor-image-cropper">Crop</span>';
  QorRedactor.MODAL = (
    '<div class="qor-modal fade qor-modal--cropper" tabindex="-1" role="dialog" aria-hidden="true">' +
      '<div class="mdl-card mdl-shadow--2dp" role="document">' +
        '<div class="mdl-card__title">' +
          '<h2 class="mdl-card__title-text">Crop the image</h2>' +
        '</div>' +
        '<div class="mdl-card__supporting-text">' +
          '<div class="qor-cropper-container"></div>' +
        '</div>' +
        '<div class="mdl-card__actions mdl-card--border">' +
          '<a class="mdl-button mdl-button-colored mdl-js-button mdl-js-ripple-effect qor-cropper-save">OK</a>' +
          '<a class="mdl-button mdl-js-button mdl-js-ripple-effect" data-dismiss="modal">Cancel</a>' +
        '</div>' +
        '<div class="mdl-card__menu">' +
          '<button class="mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect" data-dismiss="modal" aria-label="close">' +
            '<i class="material-icons">close</i>' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );

  QorRedactor.plugin = function (options) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data(NAMESPACE);
      var config;
      var fn;

      if (!data) {
        if (!$.fn.redactor) {
          return;
        }

        if (/destroy/.test(options)) {
          return;
        }

        $this.data(NAMESPACE, (data = {}));
        config = $this.data();

        $this.redactor({
          imageUpload: config.uploadUrl,
          fileUpload: config.uploadUrl,

          initCallback: function () {
            $this.data(NAMESPACE, (data = new QorRedactor($this, {
              remote: config.cropUrl,
              toggle: '.redactor-image-cropper',
              parent: '.form-group',
              replace: function (url) {
                return url.replace(/\.\w+$/, function (extension) {
                  return '.original' + extension;
                });
              },
              complete: $.proxy(function () {
                this.code.sync();
              }, this)
            })));
          },

          focusCallback: function (/*e*/) {
            $this.triggerHandler(EVENT_FOCUS);
          },

          blurCallback: function (/*e*/) {
            $this.triggerHandler(EVENT_BLUR);
          },

          imageUploadCallback: function (/*image, json*/) {
            $this.triggerHandler(EVENT_IMAGE_UPLOAD, arguments[0]);
          },

          imageDeleteCallback: function (/*url, image*/) {
            $this.triggerHandler(EVENT_IMAGE_DELETE, arguments[1]);
          }
        });
      } else {
        if (/destroy/.test(options)) {
          $this.redactor('core.destroy');
        }
      }

      if (typeof options === 'string' && $.isFunction(fn = data[options])) {
        fn.apply(data);
      }
    });
  };

  $(function () {
    var selector = '.qor-textarea';

    $(document)
      .on(EVENT_DISABLE, function (e) {
        QorRedactor.plugin.call($(selector, e.target), 'destroy');
      })
      .on(EVENT_ENABLE, function (e) {
        QorRedactor.plugin.call($(selector, e.target));
      })
      .triggerHandler(EVENT_ENABLE);
  });

  return QorRedactor;

});

(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as anonymous module.
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    // Node / CommonJS
    factory(require('jquery'));
  } else {
    // Browser globals.
    factory(jQuery);
  }
})(function ($) {

  'use strict';

  var NAMESPACE = 'qor.replicator';
  var EVENT_ENABLE = 'enable.' + NAMESPACE;
  var EVENT_DISABLE = 'disable.' + NAMESPACE;
  var EVENT_CLICK = 'click.' + NAMESPACE;
  var IS_TEMPLATE = 'is-template';

  function QorReplicator(element, options) {
    this.$element = $(element);
    this.options = $.extend({}, QorReplicator.DEFAULTS, $.isPlainObject(options) && options);
    this.index = 0;
    this.init();
  }

  QorReplicator.prototype = {
    constructor: QorReplicator,

    init: function () {
      var $this = this.$element;
      var options = this.options;
      var $all = $this.find(options.itemClass);
      var $template;

      if (!$all.length) {
        return;
      }

      $template = $all.filter(options.newClass);

      if (!$template.length) {
        $template = $all.last();
      }

      this.$template = $template;
      this.template = $template.prop('outerHTML');
      $template.data(IS_TEMPLATE, true).hide();

      this.parse();
      this.bind();
    },

    parse: function () {
      var i = 0;

      this.template = this.template.replace(/(\w+)\="(\S*\[\d+\]\S*)"/g, function (attribute, name, value) {
        value = value.replace(/^(\S*)\[(\d+)\]([^\[\]]*)$/, function (input, prefix, index, suffix) {
          if (input === value) {
            if (name === 'name') {
              i = index;
            }

            return (prefix + '[{{index}}]' + suffix);
          }
        });

        return (name + '="' + value + '"');
      });

      this.index = parseFloat(i);
    },

    bind: function () {
      var options = this.options;

      this.$element.
        on(EVENT_CLICK, options.addClass, $.proxy(this.add, this)).
        on(EVENT_CLICK, options.delClass, $.proxy(this.del, this));
    },

    unbind: function () {
      this.$element.
        off(EVENT_CLICK, this.add).
        off(EVENT_CLICK, this.del);
    },

    add: function (e) {
      var $template = this.$template;
      var $item = $template;
      var $target;

      if ($template && $template.is(':hidden')) {
        $template.show();
      } else {
        $target = $(e.target).closest(this.options.addClass);

        if ($target.length) {
          $item = $(this.template.replace(/\{\{index\}\}/g, ++this.index));
          $target.before($item);
        }
      }

      if ($item) {

        // Enable all JavaScript components within the fieldset
        $item.trigger('enable');
      }
    },

    del: function (e) {
      var options = this.options;
      var $item = $(e.target).closest(options.itemClass);
      var $alert;

      if ($item.is(options.newClass)) {
        if ($item.data(IS_TEMPLATE)) {
          this.$template = null;
        }

        // Destroy all JavaScript components within the fieldset
        $item.trigger('disable').remove();
      } else {
        $item.children(':visible').addClass('hidden').hide();
        $alert = $(options.alertTemplate.replace('{{name}}', this.parseName($item)));
        $alert.find(options.undoClass).one(EVENT_CLICK, function () {
          $alert.remove();
          $item.children('.hidden').removeClass('hidden').show();
        });
        $item.append($alert);
      }
    },

    parseName: function ($item) {
      var name = $item.find('input[name]').attr('name');

      if (name) {
        return name.replace(/[^\[\]]+$/, '');
      }
    },

    destroy: function () {
      this.unbind();
      this.$element.removeData(NAMESPACE);
    },
  };

  QorReplicator.DEFAULTS = {
    itemClass: false,
    newClass: false,
    addClass: false,
    delClass: false,
    alertTemplate: '',
  };

  QorReplicator.plugin = function (options) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data(NAMESPACE);
      var fn;

      if (!data) {
        $this.data(NAMESPACE, (data = new QorReplicator(this, options)));
      }

      if (typeof options === 'string' && $.isFunction(fn = data[options])) {
        fn.call(data);
      }
    });
  };

  $(function () {
    var selector = '.qor-collection-group';
    var options = {
          itemClass: '.qor-collection',
          newClass: '.qor-collection-new',
          addClass: '.qor-collection-add',
          delClass: '.qor-collection-del',
          undoClass: '.qor-collection-undo',
          alertTemplate: ('<div class="alert alert-danger"><input type="hidden" name="{{name}}._destroy" value="1"><a href="javascript:void(0);" class="alert-link qor-collection-undo">Undo Delete</a></div>'),
        };

    $(document)
      .on(EVENT_CLICK, selector, function () {
        QorReplicator.plugin.call($(this), options);
      })
      .on(EVENT_DISABLE, function (e) {
        QorReplicator.plugin.call($(selector, e.target), 'destroy');
      })
      .on(EVENT_ENABLE, function (e) {
        QorReplicator.plugin.call($(selector, e.target), options);
      })
      .triggerHandler(EVENT_ENABLE);
  });

  return QorReplicator;

});

(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as anonymous module.
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    // Node / CommonJS
    factory(require('jquery'));
  } else {
    // Browser globals.
    factory(jQuery);
  }
})(function ($) {

  'use strict';

  var $document = $(document);
  var NAMESPACE = 'qor.selector';
  var EVENT_ENABLE = 'enable.' + NAMESPACE;
  var EVENT_DISABLE = 'disable.' + NAMESPACE;
  var EVENT_CLICK = 'click.' + NAMESPACE;
  var CLASS_OPEN = 'open';
  var CLASS_ACTIVE = 'active';
  var CLASS_SELECTED = 'selected';
  var CLASS_DISABLED = 'disabled';
  var CLASS_CLEARABLE = 'clearable';
  var SELECTOR_SELECTED = '.' + CLASS_SELECTED;
  var SELECTOR_TOGGLE = '.qor-selector-toggle';
  var SELECTOR_LABEL = '.qor-selector-label';
  var SELECTOR_CLEAR = '.qor-selector-clear';
  var SELECTOR_MENU = '.qor-selector-menu';

  function QorSelector(element, options) {
    this.options = options;
    this.$element = $(element);
    this.init();
  }

  QorSelector.prototype = {
    constructor: QorSelector,

    init: function () {
      var $this = this.$element;

      this.placeholder = $this.attr('placeholder') || $this.attr('name') || 'Select';
      this.build();
    },

    build: function () {
      var $this = this.$element;
      var $selector = $(QorSelector.TEMPLATE);
      var alignedClass = this.options.aligned + '-aligned';
      var data = {};

      $selector.addClass(alignedClass).find(SELECTOR_MENU).html(function () {
        var list = [];

        $this.children().each(function () {
          var $this = $(this);
          var selected = $this.attr('selected');
          var disabled = $this.attr('disabled');
          var value = $this.attr('value');
          var label = $this.text();
          var classNames = [];

          if (selected) {
            classNames.push(CLASS_SELECTED);
            data.value = value;
            data.label = label;
          }

          if (disabled) {
            classNames.push(CLASS_DISABLED);
          }

          list.push(
            '<li' +
              (classNames.length ? ' class="' + classNames.join(' ') + '"' : '') +
              ' data-value="' + value + '"' +
              ' data-label="' + label + '"' +
            '>' +
              label +
            '</li>'
          );
        });

        return list.join('');
      });

      this.$selector = $selector;
      $this.hide().after($selector);
      this.pick(data, true);
      this.bind();
    },

    unbuild: function () {
      this.unbind();
      this.$selector.remove();
      this.$element.show();
    },

    bind: function () {
      this.$selector.on(EVENT_CLICK, $.proxy(this.click, this));
      $document.on(EVENT_CLICK, $.proxy(this.close, this));
    },

    unbind: function () {
      this.$selector.off(EVENT_CLICK, this.click);
      $document.off(EVENT_CLICK, this.close);
    },

    click: function (e) {
      var $target = $(e.target);

      e.stopPropagation();

      if ($target.is(SELECTOR_CLEAR)) {
        this.clear();
      } else if ($target.is('li')) {
        if (!$target.hasClass(CLASS_SELECTED) && !$target.hasClass(CLASS_DISABLED)) {
          this.pick($target.data());
        }

        this.close();
      } else if ($target.closest(SELECTOR_TOGGLE).length) {
        this.open();
      }
    },

    pick: function (data, initialized) {
      var $selector = this.$selector;
      var selected = !!data.value;

      $selector.
        find(SELECTOR_TOGGLE).
        toggleClass(CLASS_ACTIVE, selected).
        toggleClass(CLASS_CLEARABLE, selected && this.options.clearable).
          find(SELECTOR_LABEL).
          text(data.label || this.placeholder);

      if (!initialized) {
        $selector.
          find(SELECTOR_MENU).
            children('[data-value="' + data.value + '"]').
            addClass(CLASS_SELECTED).
            siblings(SELECTOR_SELECTED).
            removeClass(CLASS_SELECTED);

        this.$element.val(data.value).trigger('change');
      }
    },

    clear: function () {
      this.$selector.
        find(SELECTOR_TOGGLE).
        removeClass(CLASS_ACTIVE).
        removeClass(CLASS_CLEARABLE).
          find(SELECTOR_LABEL).
          text(this.placeholder).
          end().
        end().
        find(SELECTOR_MENU).
          children(SELECTOR_SELECTED).
          removeClass(CLASS_SELECTED);

      this.$element.val('').trigger('change');
    },

    open: function () {

      // Close other opened dropdowns first
      $document.triggerHandler(EVENT_CLICK);

      // Open the current dropdown
      this.$selector.addClass(CLASS_OPEN);
    },

    close: function () {
      this.$selector.removeClass(CLASS_OPEN);
    },

    destroy: function () {
      this.unbuild();
      this.$element.removeData(NAMESPACE);
    },
  };

  QorSelector.DEFAULTS = {
    aligned: 'left',
    clearable: false,
  };

  QorSelector.TEMPLATE = (
    '<div class="qor-selector">' +
      '<a class="qor-selector-toggle">' +
        '<span class="qor-selector-label"></span>' +
        '<i class="material-icons qor-selector-arrow">arrow_drop_down</i>' +
        '<i class="material-icons qor-selector-clear">clear</i>' +
      '</a>' +
      '<ul class="qor-selector-menu"></ul>' +
    '</div>'
  );

  QorSelector.plugin = function (option) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data(NAMESPACE);
      var options;
      var fn;

      if (!data) {
        if (/destroy/.test(option)) {
          return;
        }

        options = $.extend({}, QorSelector.DEFAULTS, $this.data(), typeof option === 'object' && option);
        $this.data(NAMESPACE, (data = new QorSelector(this, options)));
      }

      if (typeof option === 'string' && $.isFunction(fn = data[option])) {
        fn.apply(data);
      }
    });
  };

  $(function () {
    var selector = '[data-toggle="qor.selector"]';

    $(document)
      .on(EVENT_DISABLE, function (e) {
        QorSelector.plugin.call($(selector, e.target), 'destroy');
      })
      .on(EVENT_ENABLE, function (e) {
        QorSelector.plugin.call($(selector, e.target));
      })
      .triggerHandler(EVENT_ENABLE);
  });

  return QorSelector;

});

(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as anonymous module.
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    // Node / CommonJS
    factory(require('jquery'));
  } else {
    // Browser globals.
    factory(jQuery);
  }
})(function ($) {

  'use strict';

  var $document = $(document);
  var FormData = window.FormData;
  var NAMESPACE = 'qor.slideout';
  var EVENT_ENABLE = 'enable.' + NAMESPACE;
  var EVENT_DISABLE = 'disable.' + NAMESPACE;
  var EVENT_CLICK = 'click.' + NAMESPACE;
  var EVENT_SUBMIT = 'submit.' + NAMESPACE;
  var EVENT_SHOW = 'show.' + NAMESPACE;
  var EVENT_SHOWN = 'shown.' + NAMESPACE;
  var EVENT_HIDE = 'hide.' + NAMESPACE;
  var EVENT_HIDDEN = 'hidden.' + NAMESPACE;
  var CLASS_OPEN = 'qor-slideout-open';

  function QorSlideout(element, options) {
    this.$element = $(element);
    this.options = $.extend({}, QorSlideout.DEFAULTS, $.isPlainObject(options) && options);
    this.active = false;
    this.disabled = false;
    this.animating = false;
    this.init();
  }

  QorSlideout.prototype = {
    constructor: QorSlideout,

    init: function () {
      if (!this.$element.find('.qor-table').length) {
        return;
      }

      this.build();
      this.bind();
    },

    build: function () {
      var $slideout;

      this.$slideout = $slideout = $(QorSlideout.TEMPLATE).appendTo('body');
      this.$title = $slideout.find('.slideout-title');
      this.$body = $slideout.find('.slideout-body');
      this.$documentBody = $('body');
    },

    unbuild: function () {
      this.$title = null;
      this.$body = null;
      this.$slideout.remove();
    },

    bind: function () {
      this.$slideout.
        on(EVENT_SUBMIT, 'form', $.proxy(this.submit, this));

      $document.
        on(EVENT_CLICK, $.proxy(this.click, this));
    },

    unbind: function () {
      this.$slideout.
        off(EVENT_SUBMIT, this.submit);

      $document.
        off(EVENT_CLICK, this.click);
    },

    click: function (e) {
      var $this = this.$element;
      var slideout = this.$slideout.get(0);
      var target = e.target;
      var dismissible;
      var $target;
      var data;

      function toggleClass() {
        $this.find('tbody > tr').removeClass('active');
        $target.addClass('active');
      }

      if (e.isDefaultPrevented()) {
        return;
      }

      while (target !== document) {
        dismissible = false;
        $target = $(target);

        if (target === slideout) {
          break;
        } else if ($target.data('url')) {
          e.preventDefault();
          data = $target.data();
          this.load(data.url, data);
          break;
        } else if ($target.data('dismiss') === 'slideout') {
          this.hide();
          break;
        } else if ($target.is('tbody > tr')) {
          if (!$target.hasClass('active')) {
            $this.one(EVENT_SHOW, toggleClass);
            this.load($target.find('.qor-button--edit').attr('href'));
          }

          break;
        } else if ($target.is('.qor-button--new')) {
          e.preventDefault();
          this.load($target.attr('href'));
          break;
        } else {
          if ($target.is('.qor-button--edit') || $target.is('.qor-button--delete')) {
            e.preventDefault();
          }

          if (target) {
            // dismissible = true;
            target = target.parentNode;
          } else {
            break;
          }
        }
      }

      // if (dismissible) {
      //   $this.find('tbody > tr').removeClass('active');
      //   this.hide();
      // }
    },

    submit: function (e) {
      var form = e.target;
      var $form = $(form);
      var _this = this;
      var $submit = $form.find(':submit');

      if (FormData) {
        e.preventDefault();

        $.ajax($form.prop('action'), {
          method: $form.prop('method'),
          data: new FormData(form),
          processData: false,
          contentType: false,
          beforeSend: function () {
            $submit.prop('disabled', true);
          },
          success: function () {
            var returnUrl = $form.data('returnUrl');

            if (returnUrl) {
              _this.load(returnUrl);
            } else {
              _this.refresh();
            }
          },
          error: function () {
            window.alert(arguments[1] + (arguments[2] || ''));
          },
          complete: function () {
            $submit.prop('disabled', false);
          },
        });
      }
    },

    load: function (url, data) {
      var options = this.options;
      var method;
      var load;

      if (!url || this.disabled) {
        return;
      }

      this.disabled = true;
      data = $.isPlainObject(data) ? data : {};
      method = data.method ? data.method : 'GET';

      load = $.proxy(function () {
        $.ajax(url, {
          method: method,
          data: data,
          success: $.proxy(function (response) {
            var $response;
            var $content;

            if (method === 'GET') {
              $response = $(response);
              $content = $response.find(options.content);

              if (!$content.length) {
                return;
              }

              $content.find('.qor-button--cancel').attr('data-dismiss', 'slideout').removeAttr('href');
              this.$title.html($response.find(options.title).html());
              this.$body.html($content.html());

              this.$slideout.one(EVENT_SHOWN, function () {

                // Enable all JavaScript components within the slideout
                $(this).trigger('enable');
              }).one(EVENT_HIDDEN, function () {

                // Destroy all JavaScript components within the slideout
                $(this).trigger('disable');
              });

              this.show();
            } else {
              if (data.returnUrl) {
                this.disabled = false; // For reload
                this.load(data.returnUrl);
              } else {
                this.refresh();
              }
            }
          }, this),
          complete: $.proxy(function () {
            this.disabled = false;
          }, this),
        });
      }, this);

      if (this.active) {
        this.hide();
        this.$slideout.one(EVENT_HIDDEN, load);
      } else {
        load();
      }
    },

    show: function () {
      var $slideout = this.$slideout;
      var showEvent;

      if (this.active || this.animating) {
        return;
      }

      showEvent = $.Event(EVENT_SHOW);
      $slideout.trigger(showEvent);

      if (showEvent.isDefaultPrevented()) {
        return;
      }

      /*jshint expr:true */
      $slideout.addClass('active').get(0).offsetWidth;
      $slideout.addClass('in');
      this.animating = setTimeout($.proxy(this.shown, this), 350);
    },

    shown: function () {
      this.active = true;
      this.animating = false;
      this.$slideout.trigger(EVENT_SHOWN);

      // Disable to scroll body element
      this.$documentBody.addClass(CLASS_OPEN);
    },

    hide: function () {
      var $slideout = this.$slideout;
      var hideEvent;

      if (!this.active || this.animating) {
        return;
      }

      hideEvent = $.Event(EVENT_HIDE);
      $slideout.trigger(hideEvent);

      if (hideEvent.isDefaultPrevented()) {
        return;
      }

      $slideout.removeClass('in');
      this.animating = setTimeout($.proxy(this.hidden, this), 350);
    },

    hidden: function () {
      this.active = false;
      this.animating = false;
      this.$element.find('tbody > tr').removeClass('active');
      this.$slideout.removeClass('active').trigger(EVENT_HIDDEN);

      // Enable to scroll body element
      this.$documentBody.removeClass(CLASS_OPEN);
    },

    refresh: function () {
      this.hide();

      setTimeout(function () {
        window.location.reload();
      }, 350);
    },

    toggle: function () {
      if (this.active) {
        this.hide();
      } else {
        this.show();
      }
    },

    destroy: function () {
      this.unbind();
      this.unbuild();
      this.$element.removeData(NAMESPACE);
    },
  };

  QorSlideout.DEFAULTS = {
    title: false,
    content: false,
  };

  QorSlideout.TEMPLATE = (
    '<div class="qor-slideout">' +
      '<div class="slideout-dialog">' +
        '<div class="slideout-header">' +
          '<button type="button" class="slideout-close" data-dismiss="slideout" aria-div="Close">' +
            '<span class="material-icons">close</span>' +
          '</button>' +
          '<h3 class="slideout-title"></h3>' +
        '</div>' +
        '<div class="slideout-body"></div>' +
      '</div>' +
    '</div>'
  );

  QorSlideout.plugin = function (options) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data(NAMESPACE);
      var fn;

      if (!data) {
        if (/destroy/.test(options)) {
          return;
        }

        $this.data(NAMESPACE, (data = new QorSlideout(this, options)));
      }

      if (typeof options === 'string' && $.isFunction(fn = data[options])) {
        fn.apply(data);
      }
    });
  };

  $(function () {
    var selector = '.qor-theme-slideout';
    var options = {
          title: '.qor-form-title, .mdl-layout-title',
          content: '.qor-form-container',
        }

    $(document)
      .on(EVENT_DISABLE, function (e) {

        if (/slideout/.test(e.namespace)) {
          QorSlideout.plugin.call($(selector, e.target), 'destroy');
        }
      })
      .on(EVENT_ENABLE, function (e) {

        if (/slideout/.test(e.namespace)) {
          QorSlideout.plugin.call($(selector, e.target), options);
        }
      })
      .triggerHandler(EVENT_ENABLE);
  });

  return QorSlideout;

});

(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as anonymous module.
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    // Node / CommonJS
    factory(require('jquery'));
  } else {
    // Browser globals.
    factory(jQuery);
  }
})(function ($) {

  'use strict';

  var NAMESPACE = 'qor.textviewer';
  var EVENT_ENABLE = 'enable.' + NAMESPACE;
  var EVENT_DISABLE = 'disable.' + NAMESPACE;

  function QorTextviewer(element, options) {
    this.$element = $(element);
    this.options = $.extend({}, QorTextviewer.DEFAULTS, $.isPlainObject(options) && options);
    this.init();
  }

  QorTextviewer.prototype = {
    constructor: QorTextviewer,

    init: function () {
      this.$element.find(this.options.toggle).each(function () {
        var $this = $(this);

        // 8 for correction as `scrollHeight` will large than `offsetHeight`.
        if (this.scrollHeight > this.offsetHeight + 8) {
          $this.after(QorTextviewer.TEMPLATE);
        } else {
          $this.addClass('viewable');
        }
      });
    },

    destroy: function () {
      this.$element.removeData(NAMESPACE);
    },
  };

  QorTextviewer.DEFAULTS = {
    toggle: false,
  };

  QorTextviewer.TEMPLATE = '<p class="qor-list-ellipsis">...</p>';

  QorTextviewer.plugin = function (options) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data(NAMESPACE);
      var fn;

      if (!data) {
        if (/destroy/.test(options)) {
          return;
        }

        $this.data(NAMESPACE, (data = new QorTextviewer(this, options)));
      }

      if (typeof options === 'string' && $.isFunction(fn = data[options])) {
        fn.apply(data);
      }
    });
  };

  $(function () {
    var selector = '.qor-list';
    var options = {
          toggle: '.qor-list-text',
        };

    $(document)
      .on(EVENT_DISABLE, function (e) {
        QorTextviewer.plugin.call($(selector, e.target), 'destroy');
      })
      .on(EVENT_ENABLE, function (e) {
        QorTextviewer.plugin.call($(selector, e.target), options);
      })
      .triggerHandler(EVENT_ENABLE);
  });

});

//# sourceMappingURL=qor.js.map