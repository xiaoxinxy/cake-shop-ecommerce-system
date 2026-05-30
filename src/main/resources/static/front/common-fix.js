(function () {
    var cartKey = "cakeshopCart";
    var cacheKey = "cakeshopGoodsCache";
    var viewedKey = "cakeshopViewedGoods";
    var favoriteKey = "cakeshopFavoriteGoods";
    var compareKey = "cakeshopCompareGoods";
    var reviewKey = "cakeshopReviews";
    var captchaText = "";
    var heroTimer = null;
    var detailTimer = null;
    var flashTimer = null;

    var typeNames = {
        1: "\u51b0\u6dc7\u6dcb\u7cfb\u5217",
        2: "\u96f6\u98df\u7cfb\u5217",
        3: "\u513f\u7ae5\u7cfb\u5217",
        4: "\u6cd5\u5f0f\u7cfb\u5217",
        5: "\u7ecf\u5178\u7cfb\u5217",
        8: "\u8282\u65e5\u7cfb\u5217",
        11: "\u4e70\u4e0d\u8d77\u7cfb\u5217"
    };

    function qs(selector, root) {
        return (root || document).querySelector(selector);
    }

    function qsa(selector, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(selector));
    }

    function api(url, options) {
        return fetch(url, options).then(function (response) {
            if (!response.ok) {
                throw new Error(url);
            }
            return response.json();
        });
    }

    function money(value) {
        return "\u00a5 " + Number(value || 0).toFixed(1);
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function imageOf(goods) {
        return goods && (goods.cover || goods.image1 || goods.image2) || "/picture/13-1.jpg";
    }

    function imagesOf(goods) {
        var seen = {};
        return [goods.cover, goods.image1, goods.image2].filter(function (src) {
            if (!src || seen[src]) {
                return false;
            }
            seen[src] = true;
            return true;
        });
    }

    function getCart() {
        try {
            return JSON.parse(localStorage.getItem(cartKey) || "{}");
        } catch (e) {
            return {};
        }
    }

    function saveCart(cart) {
        localStorage.setItem(cartKey, JSON.stringify(cart));
        updateCartCount();
    }

    function getCache() {
        try {
            return JSON.parse(localStorage.getItem(cacheKey) || "{}");
        } catch (e) {
            return {};
        }
    }

    function saveGoods(goods) {
        var cache = getCache();
        goods.forEach(function (item) {
            cache[item.id] = item;
        });
        localStorage.setItem(cacheKey, JSON.stringify(cache));
    }

    function updateCartCount() {
        var cart = getCart();
        var count = Object.keys(cart).reduce(function (sum, id) {
            return sum + Number(cart[id] || 0);
        }, 0);
        qsa(".card_num").forEach(function (node) {
            node.textContent = count;
        });
    }

    function animateCart() {
        qsa(".header-action.cart").forEach(function (node) {
            node.classList.remove("cart-pop");
            void node.offsetWidth;
            node.classList.add("cart-pop");
        });
    }

    function showToast(text, type) {
        var stack = qs("#toast-stack");
        if (!stack) {
            document.body.insertAdjacentHTML("beforeend", '<div id="toast-stack" class="toast-stack"></div>');
            stack = qs("#toast-stack");
        }
        var toast = document.createElement("div");
        toast.className = "toast " + (type || "success");
        toast.textContent = text;
        stack.appendChild(toast);
        window.setTimeout(function () {
            toast.classList.add("leaving");
            window.setTimeout(function () {
                toast.remove();
            }, 260);
        }, 2100);
    }

    window.buy = function (id) {
        var cached = getCache()[id];
        if (cached && Number(cached.stock || 0) <= 0) {
            showToast("\u8be5\u5546\u54c1\u5df2\u552e\u7f44", "warn");
            return;
        }
        var cart = getCart();
        cart[id] = Number(cart[id] || 0) + 1;
        saveCart(cart);
        animateCart();
        showToast("\u5df2\u52a0\u5165\u8d2d\u7269\u8f66");
    };

    window.lessen = function (id) {
        var cart = getCart();
        if (!cart[id]) {
            return;
        }
        cart[id] -= 1;
        if (cart[id] <= 0) {
            delete cart[id];
        }
        saveCart(cart);
        renderCart();
    };

    window.deletes = function (id) {
        var cart = getCart();
        delete cart[id];
        saveCart(cart);
        renderCart();
    };

    function loadLayout() {
        var jobs = [];
        if (qs("#site-header")) {
            jobs.push(fetch("/front/header.html?v=19").then(function (r) { return r.text(); }).then(function (html) {
                qs("#site-header").outerHTML = html;
            }));
        }
        if (qs("#site-footer")) {
            jobs.push(fetch("/front/footer.html?v=19").then(function (r) { return r.text(); }).then(function (html) {
                qs("#site-footer").outerHTML = html;
            }));
        }
        return Promise.all(jobs);
    }

    function currentParams() {
        return new URLSearchParams(location.search);
    }

    function activateNav() {
        var params = currentParams();
        var key = "category";
        if (location.pathname.indexOf("index") !== -1 || location.pathname === "/") key = "home";
        if (params.get("type") === "2") key = "hot";
        if (params.get("type") === "3") key = "new";
        if (location.pathname.indexOf("user_register") !== -1) key = "register";
        if (location.pathname.indexOf("login") !== -1) key = "login";
        if (location.pathname.indexOf("order_list") !== -1) key = "orders";
        if (location.pathname.indexOf("favorites") !== -1) key = "favorites";
        if (location.pathname.indexOf("history") !== -1) key = "history";
        if (location.pathname.indexOf("user_center") !== -1) key = "profile";
        if (location.pathname.indexOf("compare") !== -1) key = "compare";
        if (location.pathname.indexOf("taste_quiz") !== -1) key = "taste";
        qsa(".site-nav a").forEach(function (link) {
            link.classList.toggle("active", link.getAttribute("data-nav") === key);
        });
    }

    function refreshUserHeader() {
        return api("/api/user/current").then(function (result) {
            document.body.classList.toggle("is-logged-in", !!(result.login && result.user));
            var memberLinks = qsa(".member-link");
            var guestLinks = qsa(".guest-link");
            var login = qs('[data-nav="login"]');
            var register = qs('[data-nav="register"]');
            var admin = qs(".admin-link");
            var logout = qs('[data-nav="logout"]');
            var userChip = qs(".user-chip");
            if (!result.login || !result.user) {
                memberLinks.forEach(function (link) { link.style.display = "none"; });
                guestLinks.forEach(function (link) { link.style.display = ""; });
                if (admin) admin.style.display = "none";
                if (logout) logout.style.display = "none";
                if (userChip) userChip.style.display = "none";
                return;
            }
            memberLinks.forEach(function (link) { link.style.display = ""; });
            guestLinks.forEach(function (link) { link.style.display = "none"; });
            if (register) register.style.display = "none";
            if (login) login.style.display = "none";
            if (logout) {
                logout.style.display = "";
                logout.onclick = function () {
                    fetch("/api/user/logout", {method: "POST"}).then(function () {
                        location.href = "/front/index.html";
                    });
                };
            }
            if (userChip) {
                userChip.textContent = result.user.username || "\u5df2\u767b\u5f55";
                userChip.style.display = "";
            }
            if (admin && result.user.isadmin) admin.style.display = "";
        }).catch(function () {
            document.body.classList.remove("is-logged-in");
        });
    }

    function requireLogin(message) {
        return api("/api/user/current").then(function (result) {
            if (result.login) {
                return true;
            }
            alert(message || "\u8bf7\u5148\u767b\u5f55");
            location.href = "/front/login.html?redirect=" + encodeURIComponent(location.pathname + location.search);
            return false;
        }).catch(function () {
            alert("\u8bf7\u5148\u767b\u5f55");
            location.href = "/front/login.html?redirect=" + encodeURIComponent(location.pathname + location.search);
            return false;
        });
    }

    function getFavoriteIds() {
        try {
            return JSON.parse(localStorage.getItem(favoriteKey) || "[]");
        } catch (e) {
            return [];
        }
    }

    function saveFavoriteIds(ids) {
        localStorage.setItem(favoriteKey, JSON.stringify(ids));
        updateFavoriteButtons();
    }

    function isFavorite(id) {
        return getFavoriteIds().some(function (item) {
            return String(item) === String(id);
        });
    }

    window.toggleFavorite = function (id) {
        var ids = getFavoriteIds();
        var wasActive = isFavorite(id);
        if (isFavorite(id)) {
            ids = ids.filter(function (item) { return String(item) !== String(id); });
        } else {
            ids.unshift(Number(id));
        }
        saveFavoriteIds(ids.slice(0, 60));
        renderFavorites();
        showToast(wasActive ? "\u5df2\u53d6\u6d88\u6536\u85cf" : "\u5df2\u52a0\u5165\u6536\u85cf");
    };

    function updateFavoriteButtons() {
        qsa("[data-favorite-id]").forEach(function (button) {
            var active = isFavorite(button.getAttribute("data-favorite-id"));
            button.classList.toggle("active", active);
            button.textContent = active ? "\u5df2\u6536\u85cf" : "\u6536\u85cf";
        });
    }

    function getCompareIds() {
        try {
            return JSON.parse(localStorage.getItem(compareKey) || "[]");
        } catch (e) {
            return [];
        }
    }

    function saveCompareIds(ids) {
        localStorage.setItem(compareKey, JSON.stringify(ids.slice(0, 4)));
        updateCompareButtons();
        renderCompareDock();
    }

    function isCompared(id) {
        return getCompareIds().some(function (item) {
            return String(item) === String(id);
        });
    }

    window.toggleCompare = function (id) {
        var ids = getCompareIds();
        var active = isCompared(id);
        if (active) {
            ids = ids.filter(function (item) { return String(item) !== String(id); });
            showToast("\u5df2\u79fb\u51fa\u5bf9\u6bd4");
        } else {
            if (ids.length >= 4) {
                ids.pop();
                showToast("\u5bf9\u6bd4\u680f\u6700\u591a\u4fdd\u7559 4 \u4e2a\u5546\u54c1");
            }
            ids.unshift(Number(id));
            showToast("\u5df2\u52a0\u5165\u5546\u54c1\u5bf9\u6bd4");
        }
        saveCompareIds(ids);
        renderCompare();
    };

    function updateCompareButtons() {
        qsa("[data-compare-id]").forEach(function (button) {
            var active = isCompared(button.getAttribute("data-compare-id"));
            button.classList.toggle("active", active);
            button.textContent = active ? "\u5df2\u52a0\u5bf9\u6bd4" : "\u52a0\u5165\u5bf9\u6bd4";
        });
    }

    function productCard(goods) {
        var stock = Number(goods.stock || 0);
        var stockBadge = stock <= 0 ? '<span class="stock-badge sold-out">\u5df2\u552e\u7f44</span>' : (stock <= 3 ? '<span class="stock-badge low-stock">\u5e93\u5b58\u7d27\u5f20</span>' : "");
        var typeLabel = typeNames[goods.typeId] || "\u7cbe\u9009\u751c\u70b9";
        var stockLabel = stock <= 0 ? "\u552e\u7f44" : ("\u5e93\u5b58 " + stock);
        return '<article class="product-card reveal-up">' +
            '<div class="product-image-wrap">' + stockBadge + '<a href="/front/goods_detail.html?id=' + goods.id + '"><img src="' + imageOf(goods) + '" alt="' + escapeHtml(goods.name) + '"></a></div>' +
            '<h3>' + escapeHtml(goods.name) + '</h3>' +
            '<div class="product-meta"><span>' + escapeHtml(typeLabel) + '</span><span>' + stockLabel + '</span></div>' +
            '<div class="price">' + money(goods.price) + '</div>' +
            '<div class="card-actions">' +
            '<a class="btn gray" href="/front/goods_detail.html?id=' + goods.id + '">\u67e5\u770b\u8be6\u60c5</a>' +
            '<button class="btn primary" onclick="buy(' + goods.id + ')">\u52a0\u5165\u8d2d\u7269\u8f66</button>' +
            '<button class="btn favorite-btn" data-favorite-id="' + goods.id + '" onclick="toggleFavorite(' + goods.id + ')">\u6536\u85cf</button>' +
            '<button class="btn compare-btn" data-compare-id="' + goods.id + '" onclick="toggleCompare(' + goods.id + ')">\u52a0\u5165\u5bf9\u6bd4</button>' +
            '</div></article>';
    }

    function renderProducts(target, url) {
        var box = qs(target);
        if (!box) return Promise.resolve();
        box.innerHTML = '<div class="empty loading-pulse">\u52a0\u8f7d\u4e2d...</div>';
        return api(url).then(function (page) {
            var rows = page.records || [];
            saveGoods(rows);
            box.innerHTML = rows.length ? rows.map(productCard).join("") : '<div class="empty">\u6682\u65e0\u5546\u54c1</div>';
            updateFavoriteButtons();
            updateCompareButtons();
            refreshScrollFx();
            return page;
        }).catch(function () {
            box.innerHTML = '<div class="empty">\u5546\u54c1\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u786e\u8ba4\u6570\u636e\u5e93\u5df2\u5bfc\u5165 schema.sql\u3002</div>';
        });
    }

    function renderRecommendation(target, url, noteTarget) {
        var box = qs(target);
        if (!box) return Promise.resolve();
        box.innerHTML = '<div class="empty">\u6b63\u5728\u8ba1\u7b97\u63a8\u8350...</div>';
        return api(url).then(function (result) {
            var rows = result.records || [];
            saveGoods(rows);
            box.innerHTML = rows.length ? rows.map(productCard).join("") : '<div class="empty">\u6682\u65e0\u63a8\u8350\u5546\u54c1</div>';
            updateFavoriteButtons();
            updateCompareButtons();
            refreshScrollFx();
            var note = noteTarget ? qs(noteTarget) : null;
            if (note) {
                note.textContent = result.basis || "\u6839\u636e\u5546\u57ce\u6570\u636e\u667a\u80fd\u63a8\u8350";
            }
            return result;
        }).catch(function () {
            box.innerHTML = '<div class="empty">\u63a8\u8350\u52a0\u8f7d\u5931\u8d25</div>';
        });
    }

    function heroSlide(goods, index) {
        return '<div class="hero-slide' + (index === 0 ? " active" : "") + '">' +
            '<div class="hero-copy"><h1>' + escapeHtml(goods.name) + '</h1>' +
            '<p>' + escapeHtml(goods.intro || "\u7cbe\u9009\u70d8\u7119\u751c\u70b9\uff0c\u9002\u5408\u4e0e\u670b\u53cb\u548c\u5bb6\u4eba\u5206\u4eab\u3002") + '</p>' +
            '<div class="price">' + money(goods.price) + '</div>' +
            '<a class="btn gray" href="/front/goods_detail.html?id=' + goods.id + '">\u67e5\u770b\u8be6\u60c5</a> ' +
            '<button class="btn primary" onclick="buy(' + goods.id + ')">\u52a0\u5165\u8d2d\u7269\u8f66</button></div>' +
            '<img src="' + imageOf(goods) + '" alt="' + escapeHtml(goods.name) + '"></div>';
    }

    function renderHeroSlider() {
        var box = qs("#home-slider");
        if (!box) return;
        api("/api/goods?current=1&size=6").then(function (page) {
            var rows = page.records || [];
            saveGoods(rows);
            if (!rows.length) return;
            box.innerHTML = '<div class="hero-slider-track">' + rows.map(heroSlide).join("") + '</div>' +
                '<button class="slider-btn prev" type="button">\u2039</button>' +
                '<button class="slider-btn next" type="button">\u203a</button>' +
                '<div class="slider-dots">' + rows.map(function (_, i) { return '<button data-slide="' + i + '"></button>'; }).join("") + '</div>';
            startHeroSlider();
        });
    }

    function startHeroSlider() {
        var slides = qsa("#home-slider .hero-slide");
        var dots = qsa("#home-slider .slider-dots button");
        var index = 0;
        function show(next) {
            index = (next + slides.length) % slides.length;
            slides.forEach(function (slide, i) { slide.classList.toggle("active", i === index); });
            dots.forEach(function (dot, i) { dot.classList.toggle("active", i === index); });
        }
        var prev = qs("#home-slider .prev");
        var next = qs("#home-slider .next");
        if (prev) prev.onclick = function () { show(index - 1); };
        if (next) next.onclick = function () { show(index + 1); };
        dots.forEach(function (dot, i) { dot.onclick = function () { show(i); }; });
        show(0);
        clearInterval(heroTimer);
        heroTimer = setInterval(function () { show(index + 1); }, 3500);
    }

    function renderHome() {
        if (!qs("#home-hot")) return;
        renderHeroSlider();
        renderDealStrip();
        renderProducts("#home-hot", "/api/goods?current=1&size=4&type=2");
        renderProducts("#home-new", "/api/goods?current=1&size=4&type=3");
        renderRecommendation("#home-guess", "/api/recommendations/home?size=4", "#home-guess-note");
    }

    function listTitle(params) {
        if (params.get("keyword")) return "\u641c\u7d22\uff1a" + params.get("keyword");
        if (params.get("type") === "2") return "\u70ed\u9500\u5546\u54c1";
        if (params.get("type") === "3") return "\u65b0\u54c1\u63a8\u8350";
        return typeNames[params.get("typeid")] || "\u5168\u90e8\u7cfb\u5217";
    }

    function renderGoodsList() {
        var box = qs("#goods-list");
        if (!box) return;
        var params = currentParams();
        bindGoodsFilter(params);
        var pageNumber = Math.max(1, parseInt(params.get("pageNumber") || "1", 10));
        var apiParams = new URLSearchParams();
        apiParams.set("current", pageNumber);
        apiParams.set("size", "8");
        ["keyword", "type", "typeid", "minPrice", "maxPrice", "sort"].forEach(function (key) {
            if (params.get(key)) apiParams.set(key, params.get(key));
        });
        var title = qs("#goods-title");
        if (title) title.textContent = listTitle(params);
        renderProducts("#goods-list", "/api/goods?" + apiParams.toString()).then(function (page) {
            if (page) renderPager(page);
        });
    }

    function bindGoodsFilter(params) {
        var form = qs("#goods-filter");
        if (!form || form.dataset.bound) return;
        form.dataset.bound = "true";
        ["keyword", "minPrice", "maxPrice", "sort"].forEach(function (key) {
            if (form.elements[key] && params.get(key)) {
                form.elements[key].value = params.get(key);
            }
        });
        form.onsubmit = function (event) {
            event.preventDefault();
            var next = new URLSearchParams();
            ["keyword", "type", "typeid"].forEach(function (key) {
                if (params.get(key)) next.set(key, params.get(key));
            });
            ["keyword", "minPrice", "maxPrice", "sort"].forEach(function (key) {
                var field = form.elements[key];
                if (field && field.value.trim()) {
                    next.set(key, field.value.trim());
                }
            });
            location.href = "/front/goodslist.html" + (next.toString() ? "?" + next.toString() : "");
        };
    }

    function renderPager(page) {
        var pager = qs("#goods-pager");
        if (!pager) return;
        var current = Number(page.current || 1);
        var pages = Math.max(1, Number(page.pages || 1));
        var total = Number(page.total || 0);
        pager.innerHTML = '<button class="btn" data-page="1">\u9996\u9875</button>' +
            '<button class="btn" data-page="' + Math.max(1, current - 1) + '">\u4e0a\u4e00\u9875</button>' +
            '<span>[' + current + '/' + pages + ']</span><span>[' + total + ']</span>' +
            '<button class="btn" data-page="' + Math.min(pages, current + 1) + '">\u4e0b\u4e00\u9875</button>' +
            '<button class="btn" data-page="' + pages + '">\u5c3e\u9875</button>' +
            '<input class="form-control" id="go-page"><button class="btn" id="go-page-btn">GO</button>';
        qsa("[data-page]", pager).forEach(function (button) {
            button.onclick = function () { goPage(button.getAttribute("data-page")); };
        });
        qs("#go-page-btn", pager).onclick = function () { goPage(qs("#go-page", pager).value); };
    }

    function goPage(page) {
        var params = currentParams();
        params.set("pageNumber", Math.max(1, parseInt(page || "1", 10)));
        location.href = "/front/goodslist.html?" + params.toString();
    }

    function detailGallery(goods) {
        var images = detailImages(goods);
        return '<div class="detail-gallery">' +
            '<div class="detail-main"><img id="detail-main-img" src="' + images[0] + '" alt="' + escapeHtml(goods.name) + '"></div>' +
            '<button class="slider-btn prev detail-prev" type="button">\u2039</button>' +
            '<button class="slider-btn next detail-next" type="button">\u203a</button>' +
            '<div class="detail-thumbs">' + images.map(function (src, i) {
                return '<button data-detail-image="' + i + '"><img src="' + src + '" alt=""></button>';
            }).join("") + '</div></div>';
    }

    function detailImages(goods) {
        var images = imagesOf(goods);
        return images.length ? images : ["/picture/13-1.jpg"];
    }

    function detailSeriesAside(activeTypeId) {
        var items = ['<a class="' + (!activeTypeId ? "active" : "") + '" href="/goods_list">\u5168\u90e8\u7cfb\u5217</a>'];
        Object.keys(typeNames).sort(function (a, b) { return Number(a) - Number(b); }).forEach(function (id) {
            items.push('<a class="' + (String(activeTypeId || "") === String(id) ? "active" : "") + '" href="/goods_list?typeid=' + id + '">' + typeNames[id] + '</a>');
        });
        return '<aside class="detail-series" aria-label="\u5546\u54c1\u7cfb\u5217">' + items.join("") + '</aside>';
    }

    function startDetailGallery(images) {
        var index = 0;
        var main = qs("#detail-main-img");
        var thumbs = qsa("[data-detail-image]");
        if (!images.length) images = ["/picture/13-1.jpg"];
        function show(next) {
            index = (next + images.length) % images.length;
            if (main) main.src = images[index];
            thumbs.forEach(function (thumb, i) { thumb.classList.toggle("active", i === index); });
        }
        thumbs.forEach(function (thumb, i) { thumb.onclick = function () { show(i); }; });
        var prev = qs(".detail-prev");
        var next = qs(".detail-next");
        if (prev) prev.onclick = function () { show(index - 1); };
        if (next) next.onclick = function () { show(index + 1); };
        show(0);
        clearInterval(detailTimer);
        detailTimer = setInterval(function () { show(index + 1); }, 3000);
    }

    function getViewedIds() {
        try {
            return JSON.parse(localStorage.getItem(viewedKey) || "[]");
        } catch (e) {
            return [];
        }
    }

    function rememberViewed(goods) {
        if (!goods || !goods.id) return;
        saveGoods([goods]);
        var ids = getViewedIds().filter(function (id) {
            return String(id) !== String(goods.id);
        });
        ids.unshift(goods.id);
        localStorage.setItem(viewedKey, JSON.stringify(ids.slice(0, 8)));
    }

    function renderSimilarGoods(goodsId) {
        renderRecommendation("#similar-goods", "/api/recommendations/similar/" + goodsId + "?size=4", "#similar-note");
    }

    function renderRecentlyViewed(currentId) {
        var box = qs("#recent-viewed");
        if (!box) return;
        var cache = getCache();
        var rows = getViewedIds()
            .filter(function (id) { return String(id) !== String(currentId); })
            .map(function (id) { return cache[id]; })
            .filter(Boolean)
            .slice(0, 4);
        box.innerHTML = rows.length ? rows.map(productCard).join("") : '<div class="empty">\u6682\u65e0\u6700\u8fd1\u6d4f\u89c8\u8bb0\u5f55</div>';
    }

    function renderHistory() {
        var box = qs("#history-list");
        if (!box) return;
        var cache = getCache();
        var ids = getViewedIds();
        var missing = ids.filter(function (id) { return !cache[id]; });
        if (missing.length) {
            api("/api/goods/batch?ids=" + encodeURIComponent(missing.join(","))).then(function (goods) {
                saveGoods(goods || []);
                renderHistory();
            }).catch(function () {});
        }
        var rows = ids.map(function (id) { return cache[id]; }).filter(Boolean);
        box.innerHTML = rows.length ? rows.map(productCard).join("") : '<section class="empty-state reveal-up"><h2>\u6682\u65e0\u6d4f\u89c8\u8db3\u8ff9</h2><p>\u53bb\u5546\u54c1\u5217\u8868\u770b\u770b\uff0c\u7cfb\u7edf\u4f1a\u81ea\u52a8\u8bb0\u5f55\u4f60\u70b9\u8fdb\u8be6\u60c5\u9875\u7684\u5546\u54c1\u3002</p><a class="btn primary" href="/goods_list">\u53bb\u901b\u5546\u54c1</a></section>';
        updateFavoriteButtons();
        updateCompareButtons();
        refreshScrollFx();
        var clear = qs("#clear-history");
        if (clear && !clear.dataset.bound) {
            clear.dataset.bound = "true";
            clear.onclick = function () {
                localStorage.removeItem(viewedKey);
                renderHistory();
                showToast("\u6d4f\u89c8\u8db3\u8ff9\u5df2\u6e05\u7a7a");
            };
        }
    }

    function getReviews() {
        try {
            return JSON.parse(localStorage.getItem(reviewKey) || "{}");
        } catch (e) {
            return {};
        }
    }

    function saveReviews(reviews) {
        localStorage.setItem(reviewKey, JSON.stringify(reviews));
    }

    function goodsReviews(goodsId) {
        return getReviews()[goodsId] || [];
    }

    function reviewAverage(rows) {
        if (!rows.length) return "\u6682\u65e0\u8bc4\u5206";
        var avg = rows.reduce(function (sum, row) { return sum + Number(row.rating || 0); }, 0) / rows.length;
        return avg.toFixed(1) + " \u5206 / " + rows.length + " \u6761\u8bc4\u4ef7";
    }

    function renderReviews(goodsId) {
        var box = qs("#review-list");
        var summary = qs("#review-summary");
        if (!box) return;
        var rows = goodsReviews(goodsId);
        if (summary) summary.textContent = reviewAverage(rows);
        box.innerHTML = rows.length ? rows.map(function (row) {
            return '<div class="review-row"><strong>' + "\u2605\u2605\u2605\u2605\u2605".slice(0, Number(row.rating || 5)) + '</strong><span>' + escapeHtml(row.name || "\u533f\u540d\u7528\u6237") + '</span><p>' + escapeHtml(row.content || "") + '</p></div>';
        }).join("") : '<div class="empty compact-empty">\u6682\u65e0\u8bc4\u4ef7\uff0c\u6765\u5199\u7b2c\u4e00\u6761\u5427\u3002</div>';
    }

    function bindReviewForm(goodsId) {
        var form = qs("#review-form");
        if (!form || form.dataset.bound) return;
        form.dataset.bound = "true";
        form.onsubmit = function (event) {
            event.preventDefault();
            var reviews = getReviews();
            var rows = reviews[goodsId] || [];
            rows.unshift({
                rating: Number(form.elements.rating.value || 5),
                name: form.elements.name.value || "\u533f\u540d\u7528\u6237",
                content: form.elements.content.value,
                time: new Date().toISOString()
            });
            reviews[goodsId] = rows.slice(0, 20);
            saveReviews(reviews);
            form.reset();
            renderReviews(goodsId);
        };
    }

    function renderDetail() {
        var box = qs("#goods-detail");
        if (!box) return;
        var id = currentParams().get("id");
        if (!id) {
            box.innerHTML = '<div class="empty">\u7f3a\u5c11\u5546\u54c1 ID</div>';
            return;
        }
        api("/api/goods/" + id).then(function (goods) {
            if (!goods || !goods.id) {
                box.innerHTML = '<div class="empty">\u5546\u54c1\u4e0d\u5b58\u5728</div>';
                return;
            }
            saveGoods([goods]);
            document.title = goods.name + " - CakeShop";
            var typeName = typeNames[goods.typeId] || "\u672a\u5206\u7c7b";
            box.innerHTML = '<div class="detail">' + detailGallery(goods) +
                '<section class="detail-info"><h1>' + escapeHtml(goods.name) + '</h1>' +
                '<p class="detail-type">\u5206\u7c7b\uff1a<a href="/goods_list?typeid=' + (goods.typeId || "") + '">' + typeName + '</a></p>' +
                '<p class="intro">' + escapeHtml(goods.intro || "") + '</p>' +
                '<div class="price">' + money(goods.price) + '</div>' +
                '<p>\u5e93\u5b58\uff1a' + (goods.stock || 0) + '</p>' +
                '<button class="btn primary" onclick="buy(' + goods.id + ')">\u52a0\u5165\u8d2d\u7269\u8f66</button> ' +
                '<button class="btn favorite-btn" data-favorite-id="' + goods.id + '" onclick="toggleFavorite(' + goods.id + ')">\u6536\u85cf</button> ' +
                '<button class="btn compare-btn" data-compare-id="' + goods.id + '" onclick="toggleCompare(' + goods.id + ')">\u52a0\u5165\u5bf9\u6bd4</button></section>' +
                detailSeriesAside(goods.typeId) + '</div>' +
                '<section class="home-band detail-recommend-section"><div class="band-heading"><div>' +
                '<h2 class="section-title">\u76f8\u4f3c\u5546\u54c1\u63a8\u8350</h2><p id="similar-note">\u6b63\u5728\u6839\u636e\u5206\u7c7b\u3001\u4ef7\u683c\u548c\u9500\u91cf\u8ba1\u7b97</p>' +
                '</div><a href="/goods_list?typeid=' + (goods.typeId || "") + '">\u67e5\u770b\u540c\u7c7b</a></div>' +
                '<div id="similar-goods" class="product-grid"></div></section>' +
                '<section class="home-band recent-section"><div class="band-heading"><div>' +
                '<h2 class="section-title">\u6700\u8fd1\u6d4f\u89c8</h2><p>\u65b9\u4fbf\u7b54\u8fa9\u65f6\u5c55\u793a\u7528\u6237\u884c\u4e3a\u8bb0\u5f55</p>' +
                '</div><a href="/goods_list">\u5168\u90e8\u5546\u54c1</a></div><div id="recent-viewed" class="product-grid"></div></section>' +
                '<section class="home-band review-section"><div class="band-heading"><div>' +
                '<h2 class="section-title">\u5546\u54c1\u8bc4\u4ef7</h2><p id="review-summary">\u6682\u65e0\u8bc4\u5206</p></div></div>' +
                '<form id="review-form" class="review-form"><select class="form-control" name="rating"><option value="5">5 \u5206</option><option value="4">4 \u5206</option><option value="3">3 \u5206</option><option value="2">2 \u5206</option><option value="1">1 \u5206</option></select>' +
                '<input class="form-control" name="name" placeholder="\u4f60\u7684\u6635\u79f0"><input class="form-control wide" name="content" placeholder="\u5199\u4e00\u53e5\u8bc4\u4ef7" required><button class="btn primary" type="submit">\u63d0\u4ea4\u8bc4\u4ef7</button></form>' +
                '<div id="review-list"></div></section>';
            startDetailGallery(detailImages(goods));
            renderSimilarGoods(goods.id);
            renderRecentlyViewed(goods.id);
            rememberViewed(goods);
            updateFavoriteButtons();
            updateCompareButtons();
            renderReviews(goods.id);
            bindReviewForm(goods.id);
        }).catch(function () {
            box.innerHTML = '<div class="empty">\u5546\u54c1\u8be6\u60c5\u52a0\u8f7d\u5931\u8d25</div>';
        });
    }

    function renderFavorites() {
        var box = qs("#favorite-list");
        if (!box) return;
        var cache = getCache();
        var ids = getFavoriteIds();
        var rows = ids.map(function (id) {
            return cache[id];
        }).filter(Boolean);
        var missing = ids.filter(function (id) {
            return !cache[id];
        });
        if (missing.length) {
            api("/api/goods/batch?ids=" + encodeURIComponent(missing.join(","))).then(function (goods) {
                saveGoods(goods || []);
                renderFavorites();
            }).catch(function () {});
        }
        if (!rows.length) {
            box.innerHTML = '<div class="empty">\u6682\u65e0\u6536\u85cf\u5546\u54c1\uff0c\u53bb\u5546\u54c1\u5217\u8868\u770b\u770b\u5427\u3002</div>';
            return;
        }
        box.innerHTML = rows.map(productCard).join("");
        updateFavoriteButtons();
        updateCompareButtons();
    }

    function loadGoodsByIds(ids, callback) {
        var cache = getCache();
        var missing = ids.filter(function (id) { return !cache[id]; });
        if (missing.length) {
            api("/api/goods/batch?ids=" + encodeURIComponent(missing.join(","))).then(function (goods) {
                saveGoods(goods || []);
                callback(ids.map(function (id) { return getCache()[id]; }).filter(Boolean));
            }).catch(function () {
                callback(ids.map(function (id) { return cache[id]; }).filter(Boolean));
            });
            return;
        }
        callback(ids.map(function (id) { return cache[id]; }).filter(Boolean));
    }

    function renderCompareDock() {
        var ids = getCompareIds();
        var dock = qs("#compare-dock");
        if (!ids.length) {
            if (dock) dock.remove();
            return;
        }
        if (!dock) {
            document.body.insertAdjacentHTML("beforeend",
                '<aside id="compare-dock" class="compare-dock">' +
                '<strong>\u5546\u54c1\u5bf9\u6bd4</strong><span id="compare-dock-count"></span>' +
                '<a class="btn primary mini-btn" href="/front/compare.html">\u67e5\u770b\u5bf9\u6bd4</a>' +
                '<button class="btn gray mini-btn" type="button" id="compare-dock-clear">\u6e05\u7a7a</button>' +
                '</aside>');
            dock = qs("#compare-dock");
            qs("#compare-dock-clear", dock).onclick = function () {
                saveCompareIds([]);
                renderCompare();
                showToast("\u5bf9\u6bd4\u680f\u5df2\u6e05\u7a7a");
            };
        }
        var count = qs("#compare-dock-count", dock);
        if (count) count.textContent = ids.length + " / 4";
    }

    function compareRow(label, rows, mapper) {
        return '<tr><th>' + label + '</th>' + rows.map(function (goods) {
            return '<td>' + mapper(goods) + '</td>';
        }).join("") + '</tr>';
    }

    function renderCompare() {
        var box = qs("#compare-box");
        if (!box) return;
        var ids = getCompareIds();
        if (!ids.length) {
            box.innerHTML = '<section class="empty-state reveal-up"><h2>\u8fd8\u6ca1\u6709\u52a0\u5165\u5bf9\u6bd4\u7684\u5546\u54c1</h2><p>\u5728\u5546\u54c1\u5361\u7247\u4e0a\u70b9\u201c\u52a0\u5165\u5bf9\u6bd4\u201d\uff0c\u6700\u591a\u53ef\u540c\u65f6\u5bf9\u6bd4 4 \u4e2a\u3002</p><a class="btn primary" href="/goods_list">\u53bb\u9009\u5546\u54c1</a></section>';
            refreshScrollFx();
            return;
        }
        box.innerHTML = '<div class="empty loading-pulse">\u6b63\u5728\u751f\u6210\u5bf9\u6bd4\u8868...</div>';
        loadGoodsByIds(ids, function (rows) {
            if (!rows.length) {
                box.innerHTML = '<section class="empty-state"><h2>\u5bf9\u6bd4\u5546\u54c1\u5df2\u5931\u6548</h2><button class="btn gray" onclick="localStorage.removeItem(\'' + compareKey + '\');location.reload()">\u6e05\u7a7a\u91cd\u9009</button></section>';
                return;
            }
            var cheapest = rows.slice().sort(function (a, b) { return Number(a.price || 0) - Number(b.price || 0); })[0];
            var stocked = rows.slice().sort(function (a, b) { return Number(b.stock || 0) - Number(a.stock || 0); })[0];
            box.innerHTML = '<section class="compare-hero reveal-up"><div><span>\u65b0\u529f\u80fd</span><h1>\u5546\u54c1\u5bf9\u6bd4\u4e2d\u5fc3</h1><p>\u4ef7\u683c\u3001\u5e93\u5b58\u3001\u5206\u7c7b\u548c\u64cd\u4f5c\u4e00\u5f20\u8868\u770b\u6e05\uff0c\u9002\u5408\u7ed9\u8001\u5e08\u5c55\u793a\u201c\u8d2d\u7269\u51b3\u7b56\u8f85\u52a9\u201d\u3002</p></div><button id="compare-clear" class="btn gray" type="button">\u6e05\u7a7a\u5bf9\u6bd4</button></section>' +
                '<section class="compare-insight reveal-up"><div><strong>\u4ef7\u683c\u66f4\u4f18</strong><span>' + escapeHtml(cheapest.name) + ' ' + money(cheapest.price) + '</span></div><div><strong>\u5e93\u5b58\u66f4\u5145\u8db3</strong><span>' + escapeHtml(stocked.name) + ' ' + (stocked.stock || 0) + '</span></div></section>' +
                '<div class="compare-table-wrap reveal-up"><table class="table compare-table"><tbody>' +
                compareRow("\u5546\u54c1", rows, function (g) { return '<img src="' + imageOf(g) + '" alt=""><strong>' + escapeHtml(g.name) + '</strong>'; }) +
                compareRow("\u5206\u7c7b", rows, function (g) { return escapeHtml(typeNames[g.typeId] || "\u672a\u5206\u7c7b"); }) +
                compareRow("\u4ef7\u683c", rows, function (g) { return '<b>' + money(g.price) + '</b>'; }) +
                compareRow("\u5e93\u5b58", rows, function (g) { return Number(g.stock || 0) <= 3 ? '<span class="stock-text warn">' + (g.stock || 0) + '</span>' : '<span class="stock-text">' + (g.stock || 0) + '</span>'; }) +
                compareRow("\u64cd\u4f5c", rows, function (g) { return '<a class="btn primary mini-btn" href="/front/goods_detail.html?id=' + g.id + '">\u8be6\u60c5</a> <button class="btn danger mini-btn" onclick="toggleCompare(' + g.id + ')">\u79fb\u51fa</button>'; }) +
                '</tbody></table></div>';
            var clear = qs("#compare-clear");
            if (clear) clear.onclick = function () {
                saveCompareIds([]);
                renderCompare();
                showToast("\u5bf9\u6bd4\u680f\u5df2\u6e05\u7a7a");
            };
            refreshScrollFx();
        });
    }

    function initTasteQuiz() {
        var form = qs("#taste-form");
        var result = qs("#taste-result");
        if (!form || !result || form.dataset.bound) return;
        form.dataset.bound = "true";
        form.onsubmit = function (event) {
            event.preventDefault();
            var scene = form.elements.scene.value;
            var flavor = form.elements.flavor.value;
            var budget = Number(form.elements.budget.value || 80);
            var typeId = flavor === "ice" ? 1 : (flavor === "kids" ? 3 : (flavor === "classic" ? 5 : ""));
            var url = "/api/goods?current=1&size=8" + (typeId ? "&typeid=" + typeId : "");
            result.innerHTML = '<div class="empty loading-pulse">\u6b63\u5728\u751f\u6210\u53e3\u5473\u63a8\u8350...</div>';
            api(url).then(function (page) {
                var rows = (page.records || []).filter(function (goods) {
                    return Number(goods.price || 0) <= budget;
                });
                if (!rows.length) rows = page.records || [];
                saveGoods(rows);
                var title = scene === "party" ? "\u9002\u5408\u805a\u4f1a\u5206\u4eab" : (scene === "gift" ? "\u9002\u5408\u9001\u793c\u7684\u7cbe\u81f4\u6b3e" : "\u9002\u5408\u81ea\u5df1\u5956\u52b1\u4e00\u4e0b");
                result.innerHTML = '<section class="taste-result reveal-up"><span>\u6d4b\u8bc4\u7ed3\u679c</span><h2>' + title + '</h2><p>\u6839\u636e\u4f60\u7684\u573a\u666f\u3001\u53e3\u5473\u548c\u9884\u7b97\uff0c\u4e3a\u4f60\u6311\u51fa\u4e0b\u9762\u8fd9\u4e9b\u3002</p></section><div class="product-grid">' + rows.slice(0, 4).map(productCard).join("") + '</div>';
                updateFavoriteButtons();
                updateCompareButtons();
                refreshScrollFx();
            }).catch(function () {
                result.innerHTML = '<div class="empty">\u6d4b\u8bc4\u5931\u8d25\uff0c\u8bf7\u786e\u8ba4\u540e\u7aef\u6b63\u5e38\u3002</div>';
            });
        };
    }

    function cartItems() {
        var cart = getCart();
        return Object.keys(cart).map(function (id) {
            return {goodsId: Number(id), amount: Number(cart[id] || 0)};
        }).filter(function (item) { return item.amount > 0; });
    }

    function cartTotal() {
        var cart = getCart();
        var cache = getCache();
        return Object.keys(cart).reduce(function (sum, id) {
            var goods = cache[id] || {};
            return sum + Number(goods.price || 0) * Number(cart[id] || 0);
        }, 0);
    }

    function couponDiscount(code, total) {
        var value = String(code || "").trim().toUpperCase();
        if (value === "CAKE10" && total >= 50) return 10;
        if (value === "NEW20" && total >= 100) return 20;
        return 0;
    }

    function updateCouponHint() {
        var form = qs("#order-form");
        var hint = qs("#coupon-hint");
        if (!form || !hint) return;
        var total = cartTotal();
        var code = form.elements.couponCode ? form.elements.couponCode.value : "";
        var discount = couponDiscount(code, total);
        if (!code.trim()) {
            hint.textContent = "CAKE10\uff1a\u6ee1 50 \u51cf 10\uff1bNEW20\uff1a\u6ee1 100 \u51cf 20\u3002";
        } else if (discount > 0) {
            hint.textContent = "\u4f18\u60e0\u5238\u53ef\u7528\uff0c\u9884\u8ba1\u4f18\u60e0 " + money(discount) + "\uff0c\u5e94\u4ed8 " + money(total - discount) + "\u3002";
        } else {
            hint.textContent = "\u4f18\u60e0\u5238\u4e0d\u53ef\u7528\u6216\u672a\u8fbe\u5230\u6ee1\u51cf\u91d1\u989d\u3002\u5f53\u524d\u5546\u54c1\u91d1\u989d " + money(total) + "\u3002";
        }
    }

    function renderCart() {
        var box = qs("#cart-list");
        if (!box) return;
        var cart = getCart();
        var cache = getCache();
        var ids = Object.keys(cart).filter(function (id) { return cart[id] > 0; });
        if (!ids.length) {
            box.innerHTML = '<div class="empty">\u8d2d\u7269\u8f66\u662f\u7a7a\u7684\uff0c\u53bb\u5546\u54c1\u5217\u8868\u9009\u4e00\u70b9\u751c\u7684\u5427\u3002</div>';
            var totalEmpty = qs("#cart-total");
            if (totalEmpty) totalEmpty.textContent = "\u8ba2\u5355\u603b\u91d1\u989d\uff1a" + money(0);
            var checkoutEmpty = qs("#checkout-action");
            if (checkoutEmpty) checkoutEmpty.style.display = "none";
            return;
        }
        var total = 0;
        box.innerHTML = ids.map(function (id) {
            var goods = cache[id] || {id: id, name: "\u5546\u54c1 " + id, price: 0, cover: "/picture/13-1.jpg"};
            var amount = Number(cart[id]);
            total += Number(goods.price || 0) * amount;
            return '<div class="cart-row"><img src="' + imageOf(goods) + '" alt="' + escapeHtml(goods.name) + '">' +
                '<div><h3>' + escapeHtml(goods.name) + '</h3><p>\u5355\u4ef7\uff1a' + money(goods.price) + '</p><p>\u6570\u91cf\uff1a' + amount + '</p></div>' +
                '<div class="cart-actions"><button class="btn" onclick="buy(' + id + ');renderCart()">\u589e\u52a0</button>' +
                '<button class="btn gray" onclick="lessen(' + id + ')">\u51cf\u5c11</button>' +
                '<button class="btn danger" onclick="deletes(' + id + ')">\u5220\u9664</button></div></div>';
        }).join("");
        var totalNode = qs("#cart-total");
        if (totalNode) totalNode.textContent = "\u8ba2\u5355\u603b\u91d1\u989d\uff1a" + money(total);
        var checkout = qs("#checkout-action");
        if (checkout) checkout.style.display = "";
        bindCheckoutGuard();
        updateCouponHint();
    }

    function bindCheckoutGuard() {
        var action = qs("#checkout-action a");
        if (!action || action.dataset.guarded) {
            return;
        }
        action.dataset.guarded = "true";
        action.onclick = function (event) {
            event.preventDefault();
            if (!cartItems().length) {
                alert("\u8d2d\u7269\u8f66\u4e3a\u7a7a");
                return;
            }
            requireLogin("\u8bf7\u5148\u767b\u5f55\u540e\u518d\u63d0\u4ea4\u8ba2\u5355").then(function (ok) {
                if (ok) {
                    location.href = "/front/order_submit.html";
                }
            });
        };
    }

    window.renderCart = renderCart;

    function renderOrderSubmit() {
        var form = qs("#order-form");
        if (!form) return;
        requireLogin("\u8bf7\u5148\u767b\u5f55\u540e\u518d\u63d0\u4ea4\u8ba2\u5355").then(function (ok) {
            if (!ok) return;
        });
        renderCart();
        api("/api/user/current").then(function (result) {
            if (result.user) {
                ["name", "phone", "address"].forEach(function (key) {
                    if (form.elements[key] && result.user[key]) form.elements[key].value = result.user[key];
                });
            }
        }).catch(function () {});
        var couponBtn = qs("#coupon-preview-btn");
        if (couponBtn) couponBtn.onclick = updateCouponHint;
        if (form.elements.couponCode) form.elements.couponCode.oninput = updateCouponHint;
        updateCouponHint();
        form.onsubmit = function (event) {
            event.preventDefault();
            var items = cartItems();
            if (!items.length) {
                alert("\u8d2d\u7269\u8f66\u4e3a\u7a7a");
                return;
            }
            var body = {
                name: form.elements.name.value,
                phone: form.elements.phone.value,
                address: form.elements.address.value,
                paytype: Number(form.elements.paytype.value || 1),
                couponCode: form.elements.couponCode ? form.elements.couponCode.value : "",
                items: items
            };
            api("/api/orders", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(body)
            }).then(function (result) {
                alert(result.message || "\u4e0b\u5355\u6210\u529f");
                if (result.success) {
                    localStorage.removeItem(cartKey);
                    if (Number(result.paytype) === 1 || Number(result.paytype) === 2) {
                        location.href = "/front/pay.html?orderId=" + result.orderId + "&payType=" + result.paytype;
                    } else {
                        location.href = "/front/order_list.html";
                    }
                }
            }).catch(function () {
                alert("\u4e0b\u5355\u5931\u8d25\uff0c\u8bf7\u5148\u767b\u5f55\u5e76\u786e\u8ba4\u6570\u636e\u5e93\u6b63\u5e38\u3002");
            });
        };
    }

    function renderOrders() {
        var box = qs("#order-list");
        if (!box) return;
        requireLogin("\u8bf7\u5148\u767b\u5f55\u540e\u67e5\u770b\u8ba2\u5355").then(function (ok) {
            if (!ok) return;
            loadOrders();
        });
    }

    function loadOrders() {
        var box = qs("#order-list");
        api("/api/orders").then(function (rows) {
            if (!rows.length) {
                box.innerHTML = '<tr><td colspan="8">\u6682\u65e0\u8ba2\u5355</td></tr>';
                return;
            }
            box.innerHTML = rows.map(function (row) {
                var order = row.order;
                var items = row.items || [];
                return '<tr><td>' + order.id + '</td><td>' + money(order.total) + '</td><td>' + order.amount + '</td><td>' + orderStatusText(order) + '</td><td>' + escapeHtml(order.name || "") + '</td><td>' + escapeHtml(order.phone || "") + '</td><td>' + items.map(function (x) { return x.goods ? escapeHtml(x.goods.name) + " x " + x.item.amount : ""; }).join("<br>") + '</td><td>' + orderActions(order) + '</td></tr>';
            }).join("");
        }).catch(function () {
            box.innerHTML = '<tr><td colspan="8">\u8bf7\u5148\u767b\u5f55\u540e\u67e5\u770b\u8ba2\u5355</td></tr>';
        });
    }

    function orderActions(order) {
        if (Number(order.status) !== 1) {
            return '<span class="muted">-</span>';
        }
        var actions = [];
        if (Number(order.paytype) === 1 || Number(order.paytype) === 2) {
            actions.push('<a class="btn primary mini-btn" href="/front/pay.html?orderId=' + order.id + '&payType=' + order.paytype + '">\u7ee7\u7eed\u652f\u4ed8</a>');
        }
        actions.push('<a class="btn gray mini-btn" href="/front/tracking.html?orderId=' + order.id + '">\u7269\u6d41</a>');
        actions.push('<button class="btn danger mini-btn" onclick="cancelOrder(' + order.id + ')">\u53d6\u6d88</button>');
        return actions.join(" ");
    }

    window.cancelOrder = function (id) {
        if (!confirm("\u786e\u5b9a\u53d6\u6d88\u8fd9\u4e2a\u8ba2\u5355\u5417\uff1f")) return;
        api("/api/orders/" + id + "/cancel", {method: "POST"}).then(function (result) {
            alert(result.message || "\u64cd\u4f5c\u5b8c\u6210");
            loadOrders();
        }).catch(function () {
            alert("\u53d6\u6d88\u5931\u8d25");
        });
    };

    function statusText(status) {
        return {1: "\u5f85\u4ed8\u6b3e", 2: "\u5df2\u4ed8\u6b3e", 3: "\u914d\u9001\u4e2d", 4: "\u5df2\u5b8c\u6210", 5: "\u5df2\u53d6\u6d88"}[status] || "\u5f85\u5904\u7406";
    }

    function orderStatusText(order) {
        if (Number(order.status) === 1 && Number(order.paytype) === 3) {
            return "\u8d27\u5230\u4ed8\u6b3e\u5f85\u5904\u7406";
        }
        return statusText(order.status);
    }

    function renderPayment() {
        var box = qs("#pay-box");
        if (!box) return;
        var orderId = currentParams().get("orderId");
        var payType = currentParams().get("payType");
        if (!orderId) {
            box.innerHTML = '<div class="empty">\u7f3a\u5c11\u8ba2\u5355\u53f7</div>';
            return;
        }
        box.innerHTML = '<div class="empty">\u6b63\u5728\u521b\u5efa\u6c99\u7bb1\u652f\u4ed8...</div>';
        var url = "/api/payments/" + orderId + (payType ? "?payType=" + encodeURIComponent(payType) : "");
        api(url).then(function (pay) {
            if (!pay.success) {
                box.innerHTML = '<div class="empty">' + escapeHtml(pay.message || "\u652f\u4ed8\u521b\u5efa\u5931\u8d25") + '</div>';
                return;
            }
            box.innerHTML = '<section class="pay-card">' +
                '<div><p class="pay-badge">\u6c99\u7bb1\u6a21\u5f0f</p><h1>' + escapeHtml(pay.channelName) + '</h1>' +
                '<p>\u8ba2\u5355\u53f7\uff1a' + pay.orderId + '</p><p>\u4ea4\u6613\u53f7\uff1a' + escapeHtml(pay.tradeNo) + '</p>' +
                '<div class="price">\u5e94\u4ed8\uff1a' + money(pay.amount) + '</div>' +
                '<p class="muted">' + escapeHtml(pay.message) + '</p>' +
                '<button id="pay-confirm" class="btn success" type="button">\u6211\u5df2\u5b8c\u6210\u6c99\u7bb1\u652f\u4ed8</button> ' +
                '<a class="btn gray" href="/front/order_list.html">\u8fd4\u56de\u8ba2\u5355</a></div>' +
                '<div class="sandbox-qr"><div class="qr-grid"></div><p>' + escapeHtml(pay.qrText) + '</p></div>' +
                '</section>';
            var confirmBtn = qs("#pay-confirm");
            if (pay.paid && confirmBtn) {
                confirmBtn.textContent = "\u8ba2\u5355\u5df2\u4ed8\u6b3e";
                confirmBtn.disabled = true;
            }
            if (confirmBtn) {
                confirmBtn.onclick = function () {
                    api("/api/payments/" + orderId + "/confirm", {method: "POST"}).then(function (result) {
                        alert(result.message || "\u652f\u4ed8\u6210\u529f");
                        location.href = "/front/order_list.html";
                    }).catch(function () {
                        alert("\u652f\u4ed8\u786e\u8ba4\u5931\u8d25");
                    });
                };
            }
        }).catch(function () {
            box.innerHTML = '<div class="empty">\u652f\u4ed8\u63a5\u53e3\u8fde\u63a5\u5931\u8d25</div>';
        });
    }

    function renderTracking() {
        var box = qs("#tracking-box");
        if (!box) return;
        var orderId = currentParams().get("orderId");
        if (!orderId) {
            box.innerHTML = '<div class="empty">\u7f3a\u5c11\u8ba2\u5355\u53f7</div>';
            return;
        }
        box.innerHTML = '<div class="empty">\u6b63\u5728\u52a0\u8f7d\u7269\u6d41...</div>';
        api("/api/orders/" + orderId + "/tracking").then(function (result) {
            if (!result.success) {
                box.innerHTML = '<div class="empty">' + escapeHtml(result.message || "\u7269\u6d41\u52a0\u8f7d\u5931\u8d25") + '</div>';
                return;
            }
            box.innerHTML = '<section class="tracking-card"><h1>\u7269\u6d41\u8ffd\u8e2a</h1>' +
                '<p>\u8ba2\u5355\u53f7\uff1a' + result.order.id + '</p><p>\u8fd0\u5355\u53f7\uff1a' + escapeHtml(result.trackingNo) + '</p><p>\u627f\u8fd0\u65b9\uff1a' + escapeHtml(result.carrier) + '</p>' +
                '<div class="tracking-steps">' + (result.steps || []).map(function (step) {
                    return '<div class="tracking-step ' + (step.done ? "done" : "") + '"><span></span><div><strong>' + escapeHtml(step.name) + '</strong><p>' + escapeHtml(step.time || "") + '</p></div></div>';
                }).join("") + '</div><a class="btn gray" href="/front/order_list.html">\u8fd4\u56de\u8ba2\u5355</a></section>';
        }).catch(function () {
            box.innerHTML = '<div class="empty">\u7269\u6d41\u63a5\u53e3\u8fde\u63a5\u5931\u8d25</div>';
        });
    }

    function newCaptcha() {
        captchaText = String(Math.floor(1000 + Math.random() * 9000));
        var box = qs("#captcha-code");
        if (box) {
            box.textContent = captchaText;
            box.setAttribute("aria-label", "\u9a8c\u8bc1\u7801 " + captchaText);
        }
    }

    function bindLoginRegister() {
        var login = qs("#login-form");
        if (login) {
            newCaptcha();
            var refresh = qs("#captcha-refresh");
            if (refresh) refresh.onclick = newCaptcha;
            var code = qs("#captcha-code");
            if (code) code.onclick = newCaptcha;
            login.onsubmit = function (event) {
                event.preventDefault();
                var input = qs("#captcha-input");
                if (!input || input.value.trim() !== captchaText) {
                    alert("\u9a8c\u8bc1\u7801\u9519\u8bef");
                    newCaptcha();
                    return;
                }
                var data = new URLSearchParams(new FormData(login));
                api("/api/user/login", {method: "POST", body: data}).then(function (result) {
                    alert(result.message);
                    if (result.success) {
                        var redirect = currentParams().get("redirect") || "/front/index.html";
                        location.href = redirect;
                    }
                    else newCaptcha();
                });
            };
        }
        var register = qs("#register-form");
        if (register) {
            register.onsubmit = function (event) {
                event.preventDefault();
                var data = new URLSearchParams(new FormData(register));
                api("/api/user/register", {method: "POST", body: data}).then(function (result) {
                    alert(result.message);
                    if (result.success) location.href = "/front/index.html";
                });
            };
        }
    }

    function bindUserCenter() {
        var profile = qs("#profile-form");
        var password = qs("#password-form");
        if (!profile && !password) return;
        requireLogin("\u8bf7\u5148\u767b\u5f55\u540e\u67e5\u770b\u4e2a\u4eba\u4e2d\u5fc3").then(function (ok) {
            if (!ok) return;
            api("/api/user/current").then(function (result) {
                var user = result.user || {};
                if (profile) {
                    ["username", "email", "name", "phone", "address"].forEach(function (key) {
                        if (profile.elements[key]) profile.elements[key].value = user[key] || "";
                    });
                }
            });
        });
        if (profile && !profile.dataset.bound) {
            profile.dataset.bound = "true";
            profile.onsubmit = function (event) {
                event.preventDefault();
                api("/api/user/profile", {method: "POST", body: new URLSearchParams(new FormData(profile))}).then(function (result) {
                    alert(result.message || "\u4fdd\u5b58\u5b8c\u6210");
                }).catch(function () {
                    alert("\u4fdd\u5b58\u5931\u8d25");
                });
            };
        }
        if (password && !password.dataset.bound) {
            password.dataset.bound = "true";
            password.onsubmit = function (event) {
                event.preventDefault();
                api("/api/user/password", {method: "POST", body: new URLSearchParams(new FormData(password))}).then(function (result) {
                    alert(result.message || "\u64cd\u4f5c\u5b8c\u6210");
                    if (result.success) password.reset();
                }).catch(function () {
                    alert("\u4fee\u6539\u5931\u8d25");
                });
            };
        }
    }

    function renderDealStrip() {
        var slider = qs("#home-slider");
        if (!slider || qs("#deal-strip")) return;
        api("/api/goods?current=1&size=1&type=2").then(function (page) {
            var goods = (page.records || [])[0];
            if (!goods) return;
            slider.insertAdjacentHTML("afterend",
                '<section id="deal-strip" class="deal-strip reveal-up">' +
                '<div><span class="deal-kicker">\u4eca\u65e5\u751c\u70b9\u7279\u60e0</span><h2>' + escapeHtml(goods.name) + '</h2><p>\u9650\u65f6\u63a8\u8350\uff0c\u9002\u5408\u4f5c\u4e3a\u9996\u9875\u6d3b\u52a8\u4f4d\u5c55\u793a\u3002</p></div>' +
                '<div class="deal-side"><strong>' + money(goods.price) + '</strong><span id="deal-countdown">--:--:--</span><a class="btn primary" href="/front/goods_detail.html?id=' + goods.id + '">\u9a6c\u4e0a\u770b\u770b</a></div>' +
                '</section>');
            startDealCountdown();
            refreshScrollFx();
        }).catch(function () {});
    }

    function startDealCountdown() {
        var node = qs("#deal-countdown");
        if (!node) return;
        clearInterval(flashTimer);
        function tick() {
            var now = new Date();
            var end = new Date(now);
            end.setHours(23, 59, 59, 999);
            var left = Math.max(0, end.getTime() - now.getTime());
            var hours = Math.floor(left / 3600000);
            var minutes = Math.floor(left / 60000) % 60;
            var seconds = Math.floor(left / 1000) % 60;
            node.textContent = [hours, minutes, seconds].map(function (part) {
                return String(part).padStart(2, "0");
            }).join(":");
        }
        tick();
        flashTimer = setInterval(tick, 1000);
    }

    function initBackTop() {
        if (qs("#back-top")) return;
        document.body.insertAdjacentHTML("beforeend", '<button id="back-top" class="back-top" type="button" title="\u8fd4\u56de\u9876\u90e8">\u2191</button>');
        var button = qs("#back-top");
        button.onclick = function () {
            window.scrollTo({top: 0, behavior: "smooth"});
        };
        function toggle() {
            button.classList.toggle("show", window.scrollY > 420);
        }
        window.addEventListener("scroll", toggle, {passive: true});
        toggle();
    }

    function initScrollFx() {
        refreshScrollFx();
    }

    function refreshScrollFx() {
        var nodes = qsa(".reveal-up:not(.is-visible)");
        if (!nodes.length) return;
        if (!("IntersectionObserver" in window)) {
            nodes.forEach(function (node) { node.classList.add("is-visible"); });
            return;
        }
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, {threshold: 0.12});
        nodes.forEach(function (node) {
            observer.observe(node);
        });
    }

    function initAssistant() {
        if (qs("#ai-assistant")) return;
        document.body.insertAdjacentHTML("beforeend",
            '<div id="ai-assistant" class="ai-assistant">' +
            '<button class="ai-toggle" type="button" title="AI\u5c0f\u52a9\u624b">AI</button>' +
            '<section class="ai-panel" aria-label="AI\u5c0f\u52a9\u624b">' +
            '<header><strong>AI\u5546\u57ce\u5c0f\u52a9\u624b</strong><button class="ai-close" type="button">\u00d7</button></header>' +
            '<div class="ai-messages"><div class="ai-message bot">\u4f60\u597d\uff0c\u6211\u53ef\u4ee5\u56de\u7b54\u5546\u54c1\u3001\u5206\u7c7b\u3001\u4ef7\u683c\u3001\u8ba2\u5355\u548c\u8d2d\u7269\u8f66\u95ee\u9898\u3002</div></div>' +
            '<form class="ai-form"><input class="ai-input" placeholder="\u95ee\u6211\u5546\u57ce\u76f8\u5173\u95ee\u9898"><button type="submit">\u53d1\u9001</button></form>' +
            '</section></div>');

        var root = qs("#ai-assistant");
        var panel = qs(".ai-panel", root);
        var messages = qs(".ai-messages", root);
        var form = qs(".ai-form", root);
        var input = qs(".ai-input", root);
        qs(".ai-toggle", root).onclick = function () {
            panel.classList.toggle("open");
            if (panel.classList.contains("open")) input.focus();
        };
        qs(".ai-close", root).onclick = function () {
            panel.classList.remove("open");
        };
        form.onsubmit = function (event) {
            event.preventDefault();
            var text = input.value.trim();
            if (!text) return;
            appendAiMessage("user", text);
            input.value = "";
            var loading = appendAiMessage("bot", "\u6b63\u5728\u601d\u8003...");
            api("/api/assistant/chat", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({message: text})
            }).then(function (result) {
                loading.textContent = result.answer || "\u6682\u65f6\u6ca1\u6709\u56de\u7b54\u3002";
                loading.classList.toggle("warn", !result.success);
                loading.classList.toggle("fallback", !!result.fallback);
            }).catch(function () {
                loading.textContent = "\u52a9\u624b\u63a5\u53e3\u8fde\u63a5\u5931\u8d25\uff0c\u8bf7\u786e\u8ba4\u540e\u7aef\u6b63\u5e38\u542f\u52a8\u3002";
                loading.classList.add("warn");
            });
        };

        function appendAiMessage(role, text) {
            var node = document.createElement("div");
            node.className = "ai-message " + role;
            node.textContent = text;
            messages.appendChild(node);
            messages.scrollTop = messages.scrollHeight;
            return node;
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        loadLayout().then(function () {
            activateNav();
            refreshUserHeader();
            updateCartCount();
            renderHome();
            renderGoodsList();
            renderDetail();
            renderCart();
            bindCheckoutGuard();
            renderOrderSubmit();
            renderOrders();
            renderPayment();
            renderTracking();
            bindLoginRegister();
            bindUserCenter();
            initAssistant();
            renderFavorites();
            renderHistory();
            renderCompare();
            initTasteQuiz();
            renderCompareDock();
            initBackTop();
            initScrollFx();
        });
    });
}());

