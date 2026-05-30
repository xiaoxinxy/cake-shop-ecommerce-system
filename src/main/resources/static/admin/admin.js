var panel = document.getElementById("admin-panel");
var currentTab = "goods";

function api(url, options) {
    return fetch(url, options).then(function (response) {
        if (!response.ok) {
            throw new Error(url);
        }
        return response.json();
    });
}

function money(value) {
    return "¥ " + Number(value || 0).toFixed(1);
}

function escapeHtml(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function formBody(form) {
    return new URLSearchParams(new FormData(form));
}

function setTab(tab) {
    currentTab = tab;
    document.querySelectorAll("[data-tab]").forEach(function (button) {
        button.className = "btn " + (button.getAttribute("data-tab") === tab ? "primary" : "gray");
    });
    load();
}

document.querySelectorAll("[data-tab]").forEach(function (button) {
    button.onclick = function () {
        setTab(button.getAttribute("data-tab"));
    };
});

function load() {
    panel.innerHTML = '<div class="empty">正在加载...</div>';
    if (currentTab === "goods") {
        loadGoods();
    } else if (currentTab === "types") {
        loadTypes();
    } else if (currentTab === "orders") {
        loadOrders();
    } else if (currentTab === "users") {
        loadUsers();
    } else {
        loadStats();
    }
}

function loadGoods() {
    api("/api/admin/goods").then(function (rows) {
        panel.innerHTML = '<h2>商品管理</h2>' +
            '<form id="goods-form" class="inline-form">' +
            '<input class="form-control" name="id" placeholder="ID，新建可不填">' +
            '<input class="form-control" name="name" placeholder="商品名称" required>' +
            '<input class="form-control" name="price" placeholder="价格" required>' +
            '<input class="form-control" name="stock" placeholder="库存" value="10">' +
            '<input class="form-control" name="typeId" placeholder="分类ID" value="1">' +
            '<input class="form-control wide" name="cover" placeholder="封面路径，如 /picture/9-1.jpg" value="/picture/9-1.jpg">' +
            '<input class="form-control wide" name="intro" placeholder="商品介绍">' +
            '<button class="btn success" type="submit">保存</button></form>' +
            '<table class="table"><thead><tr><th>ID</th><th>图片</th><th>名称</th><th>价格</th><th>库存</th><th>分类</th><th>操作</th></tr></thead><tbody>' +
            rows.map(function (g) {
                return '<tr><td>' + g.id + '</td><td><img src="' + escapeHtml(g.cover || "") + '" alt=""></td><td>' + escapeHtml(g.name || "") + '</td><td>' + money(g.price) + '</td><td>' + (g.stock || 0) + '</td><td>' + (g.typeId || "") + '</td><td><button class="btn gray mini-btn" onclick="editGoods(' + g.id + ')">编辑</button><button class="btn danger mini-btn" onclick="removeGoods(' + g.id + ')">删除</button></td></tr>';
            }).join("") + '</tbody></table>';
        window.goodsRows = rows;
        document.getElementById("goods-form").onsubmit = function (event) {
            event.preventDefault();
            api("/api/admin/goods", {method: "POST", body: formBody(event.target)}).then(loadGoods);
        };
    }).catch(showAdminError);
}

function editGoods(id) {
    var row = (window.goodsRows || []).find(function (item) { return item.id === id; });
    var form = document.getElementById("goods-form");
    if (!row || !form) return;
    ["id", "name", "price", "stock", "typeId", "cover", "intro"].forEach(function (key) {
        if (form.elements[key]) form.elements[key].value = row[key] || "";
    });
    window.scrollTo({top: 0, behavior: "smooth"});
}

function removeGoods(id) {
    if (confirm("确定删除这个商品吗？")) {
        api("/api/admin/goods/" + id, {method: "DELETE"}).then(loadGoods);
    }
}

function loadTypes() {
    api("/api/admin/types").then(function (rows) {
        panel.innerHTML = '<h2>分类管理</h2>' +
            '<form id="type-form" class="inline-form"><input class="form-control" name="id" placeholder="ID，新建可不填"><input class="form-control" name="name" placeholder="分类名称" required><button class="btn success" type="submit">保存</button></form>' +
            '<table class="table"><thead><tr><th>ID</th><th>分类名称</th><th>操作</th></tr></thead><tbody>' +
            rows.map(function (t) {
                return '<tr><td>' + t.id + '</td><td>' + escapeHtml(t.name || "") + '</td><td><button class="btn danger mini-btn" onclick="removeType(' + t.id + ')">删除</button></td></tr>';
            }).join("") + '</tbody></table>';
        document.getElementById("type-form").onsubmit = function (event) {
            event.preventDefault();
            api("/api/admin/types", {method: "POST", body: formBody(event.target)}).then(loadTypes);
        };
    }).catch(showAdminError);
}

function removeType(id) {
    if (confirm("确定删除这个分类吗？")) {
        api("/api/admin/types/" + id, {method: "DELETE"}).then(loadTypes);
    }
}

function loadOrders() {
    api("/api/admin/orders").then(function (rows) {
        panel.innerHTML = '<h2>订单管理</h2>' +
            '<table class="table"><thead><tr><th>ID</th><th>金额</th><th>数量</th><th>状态</th><th>收货人</th><th>电话</th><th>地址</th><th>操作</th></tr></thead><tbody>' +
            rows.map(function (o) {
                return '<tr><td>' + o.id + '</td><td>' + money(o.total) + '</td><td>' + (o.amount || 0) + '</td><td>' + statusText(o.status) + '</td><td>' + escapeHtml(o.name || "") + '</td><td>' + escapeHtml(o.phone || "") + '</td><td>' + escapeHtml(o.address || "") + '</td><td><button class="btn mini-btn" onclick="setOrderStatus(' + o.id + ',2)">已付款</button><button class="btn success mini-btn" onclick="setOrderStatus(' + o.id + ',4)">完成</button><button class="btn danger mini-btn" onclick="removeOrder(' + o.id + ')">删除</button></td></tr>';
            }).join("") + '</tbody></table>';
    }).catch(showAdminError);
}

function statusText(status) {
    return {1: "待付款", 2: "已付款", 3: "配送中", 4: "已完成", 5: "已取消"}[status] || "待处理";
}

function setOrderStatus(id, status) {
    api("/api/admin/orders/" + id + "/status/" + status, {method: "POST"}).then(loadOrders);
}

function removeOrder(id) {
    if (confirm("确定删除这个订单吗？")) {
        api("/api/admin/orders/" + id, {method: "DELETE"}).then(loadOrders);
    }
}

function loadUsers() {
    api("/api/admin/users").then(function (rows) {
        panel.innerHTML = '<h2>用户管理</h2>' +
            '<table class="table"><thead><tr><th>ID</th><th>用户名</th><th>邮箱</th><th>姓名</th><th>电话</th><th>地址</th><th>管理员</th><th>操作</th></tr></thead><tbody>' +
            rows.map(function (u) {
                return '<tr><td>' + u.id + '</td><td>' + escapeHtml(u.username || "") + '</td><td>' + escapeHtml(u.email || "") + '</td><td>' + escapeHtml(u.name || "") + '</td><td>' + escapeHtml(u.phone || "") + '</td><td>' + escapeHtml(u.address || "") + '</td><td>' + (u.isadmin ? "是" : "否") + '</td><td><button class="btn danger mini-btn" onclick="removeUser(' + u.id + ')">删除</button></td></tr>';
            }).join("") + '</tbody></table>';
    }).catch(showAdminError);
}

function removeUser(id) {
    if (confirm("确定删除这个用户吗？")) {
        api("/api/admin/users/" + id, {method: "DELETE"}).then(loadUsers);
    }
}

function loadStats() {
    api("/api/admin/stats").then(function (stats) {
        panel.innerHTML = '<h2>经营统计</h2>' +
            '<div class="stats-grid">' +
            statCard("已付款销售额", money(stats.paidSales)) +
            statCard("订单总数", stats.orderCount) +
            statCard("待处理订单", stats.pendingOrders) +
            statCard("已付款订单", stats.paidOrders) +
            statCard("商品数量", stats.goodsCount) +
            statCard("用户数量", stats.userCount) +
            '</div>' +
            '<h3>热销商品 TOP5</h3>' +
            '<table class="table"><thead><tr><th>商品ID</th><th>商品名称</th><th>销量</th></tr></thead><tbody>' +
            (stats.topGoods || []).map(function (item) {
                return '<tr><td>' + item.goodsId + '</td><td>' + escapeHtml(item.name || "") + '</td><td>' + item.amount + '</td></tr>';
            }).join("") + '</tbody></table>' +
            '<h3>低库存提醒</h3>' +
            '<table class="table"><thead><tr><th>ID</th><th>商品名称</th><th>库存</th><th>价格</th></tr></thead><tbody>' +
            (stats.lowStockGoods || []).map(function (item) {
                return '<tr><td>' + item.id + '</td><td>' + escapeHtml(item.name || "") + '</td><td>' + (item.stock || 0) + '</td><td>' + money(item.price) + '</td></tr>';
            }).join("") + '</tbody></table>';
    }).catch(showAdminError);
}

function statCard(label, value) {
    return '<div class="stat-card reveal-up"><span>' + label + '</span><strong>' + value + '</strong></div>';
}

function showAdminError() {
    panel.innerHTML = '<div class="empty">后台数据加载失败，请确认后端服务和数据库正常。</div>';
}

loadStats = function () {
    api("/api/admin/stats").then(function (stats) {
        var best = (stats.topGoods || [])[0] || {};
        var lowCount = (stats.lowStockGoods || []).length;
        panel.innerHTML = '<div class="stats-head">' +
            '<h2>经营统计</h2>' +
            '<p>实时汇总订单、商品、库存、支付和分类销售表现。</p>' +
            '</div>' +
            '<div class="stats-grid">' +
            statCard("已付款销售额", money(stats.paidSales)) +
            statCard("订单总数", stats.orderCount) +
            statCard("支付转化率", fixed(stats.payRate) + "%") +
            statCard("客单价", money(stats.avgOrderValue)) +
            statCard("售出件数", stats.totalSold || 0) +
            statCard("库存货值", money(stats.stockValue)) +
            '</div>' +
            '<div class="stats-hero">' +
            chartCard("7 日销售趋势", "折线展示每日销售额，柱状辅助显示订单数。", "daily-sales-chart") +
            '<section class="insight-card reveal-up"><h3>经营洞察</h3><p>自动从当前订单和商品数据里提取重点。</p>' +
            '<div class="insight-list">' +
            '<div><span>热销冠军</span><strong>' + escapeHtml(best.name || "暂无") + '</strong><em>销量 ' + (best.amount || 0) + '</em></div>' +
            '<div><span>低库存预警</span><strong>' + lowCount + ' 个</strong><em>库存小于等于 5 的商品</em></div>' +
            '<div><span>已付款订单</span><strong>' + (stats.paidOrders || 0) + '</strong><em>待处理 ' + (stats.pendingOrders || 0) + ' 单</em></div>' +
            '</div></section>' +
            '</div>' +
            '<div class="chart-grid">' +
            chartCard("分类销售额", "按商品分类统计已付款订单销售额。", "category-sales-chart") +
            chartCard("商品销售排行", "热卖商品销售额柱状排行。", "goods-sales-chart") +
            chartCard("订单状态占比", "展示待付款、已付款、配送中、已完成等状态。", "status-chart") +
            chartCard("支付方式占比", "支付宝沙箱、微信沙箱、货到付款分布。", "paytype-chart") +
            chartCard("库存结构", "缺货、低库存、库存充足的商品数量。", "stock-chart") +
            '</div>' +
            '<h3 class="stats-section-title">热销商品 TOP5</h3>' +
            '<table class="table"><thead><tr><th>商品ID</th><th>商品名称</th><th>销量</th></tr></thead><tbody>' +
            (stats.topGoods || []).map(function (item) {
                return '<tr><td>' + item.goodsId + '</td><td>' + escapeHtml(item.name || "") + '</td><td>' + item.amount + '</td></tr>';
            }).join("") + '</tbody></table>' +
            '<h3 class="stats-section-title">低库存提醒</h3>' +
            '<table class="table"><thead><tr><th>ID</th><th>商品名称</th><th>库存</th><th>价格</th></tr></thead><tbody>' +
            (stats.lowStockGoods || []).map(function (item) {
                return '<tr><td>' + item.id + '</td><td>' + escapeHtml(item.name || "") + '</td><td>' + (item.stock || 0) + '</td><td>' + money(item.price) + '</td></tr>';
            }).join("") + '</tbody></table>';
        setTimeout(function () {
            renderStatsCharts(stats);
        }, 0);
    }).catch(showAdminError);
};

function fixed(value) {
    return Number(value || 0).toFixed(1);
}

function chartCard(title, desc, id) {
    return '<section class="chart-card reveal-up"><h3>' + title + '</h3><p>' + desc + '</p><canvas id="' + id + '"></canvas></section>';
}

function renderStatsCharts(stats) {
    drawTrendChart("daily-sales-chart", stats.dailySales || []);
    drawBarChart("category-sales-chart", stats.categorySales || [], "sales", "¥", ["#f47a10", "#21a6a0"]);
    drawBarChart("goods-sales-chart", stats.goodsSalesRanking || [], "sales", "¥", ["#5f4b32", "#f47a10"]);
    drawDonutChart("status-chart", stats.statusDistribution || [], ["#f47a10", "#21a6a0", "#6f7780", "#2f7a58", "#c94b45"]);
    drawDonutChart("paytype-chart", stats.payTypeDistribution || [], ["#1677ff", "#18b66a", "#f39c12"]);
    drawDonutChart("stock-chart", stats.stockOverview || [], ["#c94b45", "#f39c12", "#2f7a58"]);
    if (!window.statsChartsResizeBound) {
        window.statsChartsResizeBound = true;
        window.addEventListener("resize", function () {
            if (currentTab === "stats" && window.latestStatsData) {
                renderStatsCharts(window.latestStatsData);
            }
        });
    }
    window.latestStatsData = stats;
}

function prepareCanvas(id) {
    var canvas = document.getElementById(id);
    if (!canvas) return null;
    var rect = canvas.getBoundingClientRect();
    var ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(320, Math.floor(rect.width * ratio));
    canvas.height = Math.max(220, Math.floor(rect.height * ratio));
    var ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.font = "13px Arial, sans-serif";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    return {canvas: canvas, ctx: ctx, width: rect.width, height: rect.height};
}

function drawNoData(ctx, width, height) {
    ctx.fillStyle = "#8b949e";
    ctx.textAlign = "center";
    ctx.fillText("暂无数据", width / 2, height / 2);
}

function drawTrendChart(id, rows) {
    var chart = prepareCanvas(id);
    if (!chart) return;
    var ctx = chart.ctx;
    var width = chart.width;
    var height = chart.height;
    if (!rows.length) {
        drawNoData(ctx, width, height);
        return;
    }
    var pad = {left: 42, right: 18, top: 18, bottom: 34};
    var plotW = width - pad.left - pad.right;
    var plotH = height - pad.top - pad.bottom;
    var maxSales = Math.max.apply(null, rows.map(function (row) { return Number(row.sales || 0); }).concat([1]));
    var maxOrders = Math.max.apply(null, rows.map(function (row) { return Number(row.orders || 0); }).concat([1]));
    ctx.strokeStyle = "#edf0ee";
    ctx.lineWidth = 1;
    for (var i = 0; i <= 4; i++) {
        var y = pad.top + plotH * i / 4;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();
    }
    var step = rows.length === 1 ? plotW : plotW / (rows.length - 1);
    var barW = Math.min(28, plotW / rows.length * .45);
    rows.forEach(function (row, index) {
        var x = pad.left + index * step;
        var h = plotH * Number(row.orders || 0) / maxOrders;
        ctx.fillStyle = "rgba(33, 166, 160, .18)";
        ctx.fillRect(x - barW / 2, pad.top + plotH - h, barW, h);
        ctx.fillStyle = "#68727d";
        ctx.textAlign = "center";
        ctx.fillText(row.label, x, height - 10);
    });
    ctx.strokeStyle = "#f47a10";
    ctx.lineWidth = 3;
    ctx.beginPath();
    rows.forEach(function (row, index) {
        var x = pad.left + index * step;
        var y = pad.top + plotH - plotH * Number(row.sales || 0) / maxSales;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    rows.forEach(function (row, index) {
        var x = pad.left + index * step;
        var y = pad.top + plotH - plotH * Number(row.sales || 0) / maxSales;
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#f47a10";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    });
    ctx.fillStyle = "#5f4b32";
    ctx.textAlign = "left";
    ctx.fillText("销售额 " + money(maxSales), pad.left, 13);
}

function drawBarChart(id, rows, valueKey, prefix, colors) {
    var chart = prepareCanvas(id);
    if (!chart) return;
    var ctx = chart.ctx;
    var width = chart.width;
    var height = chart.height;
    rows = rows.slice(0, 8);
    if (!rows.length) {
        drawNoData(ctx, width, height);
        return;
    }
    var pad = {left: 88, right: 22, top: 14, bottom: 18};
    var max = Math.max.apply(null, rows.map(function (row) { return Number(row[valueKey] || 0); }).concat([1]));
    var barH = Math.min(24, (height - pad.top - pad.bottom) / rows.length * .58);
    var gap = (height - pad.top - pad.bottom) / rows.length;
    rows.forEach(function (row, index) {
        var y = pad.top + index * gap + gap * .22;
        var value = Number(row[valueKey] || 0);
        var w = (width - pad.left - pad.right) * value / max;
        var grad = ctx.createLinearGradient(pad.left, y, pad.left + w, y);
        grad.addColorStop(0, colors[0]);
        grad.addColorStop(1, colors[1]);
        ctx.fillStyle = "#68727d";
        ctx.textAlign = "right";
        ctx.fillText(shortLabel(row.label || row.name || "未命名", 8), pad.left - 10, y + barH - 6);
        roundRect(ctx, pad.left, y, Math.max(4, w), barH, 9, grad);
        ctx.fillStyle = "#2b3035";
        ctx.textAlign = "left";
        ctx.fillText((prefix || "") + fixed(value), pad.left + w + 8, y + barH - 6);
    });
}

function drawDonutChart(id, rows, colors) {
    var chart = prepareCanvas(id);
    if (!chart) return;
    var ctx = chart.ctx;
    var width = chart.width;
    var height = chart.height;
    rows = rows.filter(function (row) { return Number(row.value || 0) > 0; });
    if (!rows.length) {
        drawNoData(ctx, width, height);
        return;
    }
    var total = rows.reduce(function (sum, row) { return sum + Number(row.value || 0); }, 0);
    var cx = Math.min(width * .36, 130);
    var cy = height / 2;
    var radius = Math.min(78, height * .32, width * .22);
    var start = -Math.PI / 2;
    rows.forEach(function (row, index) {
        var value = Number(row.value || 0);
        var angle = Math.PI * 2 * value / total;
        ctx.beginPath();
        ctx.strokeStyle = colors[index % colors.length];
        ctx.lineWidth = 24;
        ctx.arc(cx, cy, radius, start, start + angle);
        ctx.stroke();
        start += angle;
    });
    ctx.fillStyle = "#2b3035";
    ctx.textAlign = "center";
    ctx.font = "700 22px Arial, sans-serif";
    ctx.fillText(total, cx, cy + 7);
    ctx.font = "13px Arial, sans-serif";
    rows.forEach(function (row, index) {
        var y = 34 + index * 28;
        ctx.fillStyle = colors[index % colors.length];
        roundRect(ctx, width * .58, y - 11, 18, 12, 6, colors[index % colors.length]);
        ctx.fillStyle = "#2b3035";
        ctx.textAlign = "left";
        ctx.fillText(row.label + " " + row.value, width * .58 + 28, y);
    });
}

function roundRect(ctx, x, y, width, height, radius, fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    ctx.fill();
}

function shortLabel(label, size) {
    label = String(label || "");
    return label.length > size ? label.slice(0, size - 1) + "…" : label;
}

load();
