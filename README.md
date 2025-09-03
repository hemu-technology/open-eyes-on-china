# Open eyes on China

## setup page to allow copy cotent from website page

1. Input `allow pasting` in the Console and then press <Enter>
2. Execute the following code in the Console
``` javascript
(function() {
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
        el.style.userSelect = 'text';
        el.style.webkitUserSelect = 'text';
        el.style.msUserSelect = 'text';
    });
    ['copy', 'cut', 'contextmenu', 'selectstart'].forEach(event => {
        document.body.addEventListener(event, function(e) {
            e.stopPropagation();
        }, true);
    });
    console.log('✅ The page has been unlocked. Text can now be freely selected and copied.');
})();
```
## analytics
https://analytics.google.com/
https://www.bing.com/webmasters


## domain(DNS)
https://dcc.godaddy.com/
