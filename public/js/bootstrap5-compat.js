(function ($) {
    if (typeof bootstrap === 'undefined' || typeof $ === 'undefined') {
        return;
    }

    function getPlacement(element) {
        return element.getAttribute('data-bs-placement') || element.getAttribute('data-placement') || undefined;
    }

    if (typeof $.fn.modal === 'undefined') {
        $.fn.modal = function (action) {
            var args = arguments;
            return this.each(function () {
                var instance = bootstrap.Modal.getOrCreateInstance(this);
                if (typeof action === 'string') {
                    if (action === 'show') {
                        instance.show();
                    } else if (action === 'hide') {
                        instance.hide();
                    } else if (action === 'toggle') {
                        instance.toggle();
                    }
                } else if (typeof action === 'object') {
                    instance = new bootstrap.Modal(this, action);
                    if (action.show !== false) {
                        instance.show();
                    }
                }
            });
        };
    }

    if (typeof $.fn.tooltip === 'undefined') {
        $.fn.tooltip = function (config) {
            return this.each(function () {
                var element = this;
                if (config === 'dispose') {
                    var instance = bootstrap.Tooltip.getInstance(element);
                    if (instance) {
                        instance.dispose();
                    }
                    return;
                }
                if (config === 'hide') {
                    var instance = bootstrap.Tooltip.getInstance(element);
                    if (instance) {
                        instance.hide();
                    }
                    return;
                }
                var options = typeof config === 'object' && config !== null ? config : {};
                if (!options.placement) {
                    options.placement = getPlacement(element);
                }
                bootstrap.Tooltip.getOrCreateInstance(element, options);
            });
        };
    }
})(jQuery);
