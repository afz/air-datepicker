;(function () {
    var templates = {
        days:'' +
        '<div class="datepicker--days">' +
        '<div class="datepicker--days-names"></div>' +
        '<div class="datepicker--cells datepicker--cells-days"></div>' +
        '</div>'
    };

    Datepicker.Body = function (d, type, opts) {
        this.d = d;
        this.type = type;
        this.opts = opts;

        this.init();
    };

    Datepicker.Body.prototype = {
        init: function () {
            this._buildBaseHtml();
            this._render();
        },

        _buildBaseHtml: function () {
            this.$el = $(templates[this.type]).appendTo(this.d.$content);
            this.$names = $('.datepicker--days-names', this.$el);
            this.$cells = $('.datepicker--cells', this.$el);
        },

        _getDayNamesHtml: function (firstDay, curDay, html, i) {
            curDay = curDay != undefined ? curDay : firstDay;
            html = html ? html : '';
            i = i != undefined ? i : 0;

            if (i > 7) return html;
            if (curDay == 7) return this._getDayNamesHtml(firstDay, 0, html, ++i);

            html += '<div class="datepicker--day-name' + (this.d.isWeekend(curDay) ? " -weekend-" : "") + '">' + this.d.loc.days[curDay] + '</div>';

            return this._getDayNamesHtml(firstDay, ++curDay, html, ++i);
        },

        /**
         * Calculates days number to render. Generates days html and returns it.
         * @param {object} date - Date object
         * @returns {string}
         * @private
         */
        _getDaysHtml: function (date) {
            var totalMonthDays = Datepicker.getDaysCount(date),
                firstMonthDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay(),
                lastMonthDay = new Date(date.getFullYear(), date.getMonth(), totalMonthDays).getDay(),
                daysFromPevMonth = firstMonthDay - this.opts.firstDay,
                daysFromNextMonth = 6 - lastMonthDay + this.opts.firstDay;

            daysFromPevMonth = daysFromPevMonth < 0 ? daysFromPevMonth + 7 : daysFromPevMonth;
            daysFromNextMonth = daysFromNextMonth > 6 ? daysFromNextMonth - 7 : daysFromNextMonth;

            var startDayIndex = -daysFromPevMonth + 1,
                m, y,
                html = '';

            for (var i = startDayIndex, max = totalMonthDays + daysFromNextMonth; i <= max; i++) {
                y = date.getFullYear();
                m = date.getMonth();

                html += this._getDayHtml(new Date(y, m, i))
            }

            return html;
        },

        _getDayHtml: function (date) {
            var _class = "datepicker--cell datepicker--cell-day";

            if (this.d.isWeekend(date.getDay())) _class += " -weekend-";
            if (date.getMonth() != this.d.currentDate.getMonth()) _class += " -another-month-";

            return '<div class="' + _class + '">' + date.getDate() + '</div>';
        },

        _renderDays: function () {
            var dayNames = this._getDayNamesHtml(this.opts.firstDay),
                days = this._getDaysHtml(this.d.currentDate);

            this.$cells.html(days);
            this.$names.html(dayNames)
        },

        _render: function () {
            this._renderDays();
        }
    };
})();
