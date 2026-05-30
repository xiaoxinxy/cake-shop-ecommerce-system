package com.taohq.cakeshop1.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.taohq.cakeshop1.entity.Goods;
import com.taohq.cakeshop1.entity.Order;
import com.taohq.cakeshop1.entity.OrderItem;
import com.taohq.cakeshop1.entity.Recommend;
import com.taohq.cakeshop1.entity.Type;
import com.taohq.cakeshop1.entity.User;
import com.taohq.cakeshop1.service.GoodsService;
import com.taohq.cakeshop1.service.OrderItemService;
import com.taohq.cakeshop1.service.OrderService;
import com.taohq.cakeshop1.service.RecommendService;
import com.taohq.cakeshop1.service.TypeService;
import com.taohq.cakeshop1.service.UserService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final GoodsService goodsService;
    private final RecommendService recommendService;
    private final OrderService orderService;
    private final OrderItemService orderItemService;
    private final TypeService typeService;
    private final UserService userService;

    public AdminController(GoodsService goodsService, RecommendService recommendService, OrderService orderService, OrderItemService orderItemService, TypeService typeService, UserService userService) {
        this.goodsService = goodsService;
        this.recommendService = recommendService;
        this.orderService = orderService;
        this.orderItemService = orderItemService;
        this.typeService = typeService;
        this.userService = userService;
    }

    @GetMapping("/goods")
    public Object goods() {
        return goodsService.list();
    }

    @PostMapping("/goods")
    public Map<String, Object> saveGoods(Goods goods) {
        goodsService.saveOrUpdate(goods);
        return Map.of("success", true, "goods", goods);
    }

    @DeleteMapping("/goods/{id}")
    public Map<String, Object> deleteGoods(@PathVariable Integer id) {
        recommendService.remove(new LambdaQueryWrapper<Recommend>().eq(Recommend::getGoodsId, id));
        goodsService.removeById(id);
        return Map.of("success", true);
    }

    @GetMapping("/types")
    public Object types() {
        return typeService.list();
    }

    @PostMapping("/types")
    public Map<String, Object> saveType(Type type) {
        typeService.saveOrUpdate(type);
        return Map.of("success", true, "type", type);
    }

    @DeleteMapping("/types/{id}")
    public Map<String, Object> deleteType(@PathVariable Integer id) {
        typeService.removeById(id);
        return Map.of("success", true);
    }

    @GetMapping("/users")
    public Object users() {
        return userService.list();
    }

    @DeleteMapping("/users/{id}")
    public Map<String, Object> deleteUser(@PathVariable Integer id) {
        userService.removeById(id);
        return Map.of("success", true);
    }

    @GetMapping("/orders")
    public Object orders() {
        return orderService.list();
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        List<Order> orders = orderService.list();
        List<OrderItem> items = orderItemService.list();
        List<Goods> goods = goodsService.list();
        List<Type> types = typeService.list();
        Map<Integer, Goods> goodsById = new HashMap<>();
        for (Goods item : goods) {
            goodsById.put(item.getId(), item);
        }
        Map<Integer, Order> ordersById = new HashMap<>();
        for (Order order : orders) {
            ordersById.put(order.getId(), order);
        }
        Map<Integer, String> typeNames = new HashMap<>();
        for (Type type : types) {
            typeNames.put(type.getId(), type.getName());
        }

        double paidSales = orders.stream()
                .filter(this::isPaidOrder)
                .mapToDouble(order -> order.getTotal() == null ? 0 : order.getTotal())
                .sum();
        long pendingOrders = orders.stream().filter(order -> order.getStatus() != null && order.getStatus() == 1).count();
        long paidOrders = orders.stream().filter(this::isPaidOrder).count();

        Map<Integer, Integer> salesCount = new HashMap<>();
        Map<Integer, Double> goodsSales = new HashMap<>();
        int totalSold = 0;
        for (OrderItem item : items) {
            Order order = ordersById.get(item.getOrderId());
            if (!isPaidOrder(order)) {
                continue;
            }
            int amount = item.getAmount() == null ? 0 : item.getAmount();
            double price = item.getPrice() == null ? 0 : item.getPrice();
            totalSold += amount;
            salesCount.merge(item.getGoodsId(), amount, Integer::sum);
            goodsSales.merge(item.getGoodsId(), price * amount, Double::sum);
        }
        List<Map<String, Object>> topGoods = salesCount.entrySet().stream()
                .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue()))
                .limit(5)
                .map(entry -> {
                    Goods item = goodsById.get(entry.getKey());
                    return Map.<String, Object>of(
                            "goodsId", entry.getKey(),
                            "name", item == null ? "商品" + entry.getKey() : item.getName(),
                            "amount", entry.getValue()
                    );
                })
                .toList();
        List<Goods> lowStockGoods = goods.stream()
                .filter(item -> item.getStock() != null && item.getStock() <= 5)
                .sorted(Comparator.comparing(item -> item.getStock() == null ? 0 : item.getStock()))
                .limit(8)
                .toList();

        Map<String, Object> result = new HashMap<>();
        result.put("paidSales", paidSales);
        result.put("orderCount", orders.size());
        result.put("pendingOrders", pendingOrders);
        result.put("paidOrders", paidOrders);
        result.put("goodsCount", goods.size());
        result.put("userCount", userService.count());
        result.put("totalSold", totalSold);
        result.put("avgOrderValue", paidOrders == 0 ? 0 : paidSales / paidOrders);
        result.put("payRate", orders.isEmpty() ? 0 : paidOrders * 100.0 / orders.size());
        result.put("stockValue", goods.stream()
                .mapToDouble(item -> (item.getPrice() == null ? 0 : item.getPrice()) * (item.getStock() == null ? 0 : item.getStock()))
                .sum());
        result.put("topGoods", topGoods);
        result.put("lowStockGoods", lowStockGoods);
        result.put("dailySales", buildDailySales(orders));
        result.put("statusDistribution", buildStatusDistribution(orders));
        result.put("payTypeDistribution", buildPayTypeDistribution(orders));
        result.put("categorySales", buildCategorySales(items, ordersById, goodsById, typeNames));
        result.put("stockOverview", buildStockOverview(goods));
        result.put("goodsSalesRanking", buildGoodsSalesRanking(goodsSales, goodsById));
        return result;
    }

    private boolean isPaidOrder(Order order) {
        return order != null && order.getStatus() != null && order.getStatus() >= 2 && order.getStatus() < 5;
    }

    private List<Map<String, Object>> buildDailySales(List<Order> orders) {
        LocalDate today = LocalDate.now();
        Map<LocalDate, double[]> daily = new LinkedHashMap<>();
        for (int i = 6; i >= 0; i--) {
            daily.put(today.minusDays(i), new double[]{0, 0});
        }
        for (Order order : orders) {
            if (!isPaidOrder(order) || order.getDatetime() == null) {
                continue;
            }
            LocalDate date = order.getDatetime().toLocalDate();
            double[] row = daily.get(date);
            if (row == null) {
                continue;
            }
            row[0] += order.getTotal() == null ? 0 : order.getTotal();
            row[1] += 1;
        }
        List<Map<String, Object>> rows = new ArrayList<>();
        daily.forEach((date, value) -> rows.add(Map.of(
                "label", date.getMonthValue() + "/" + date.getDayOfMonth(),
                "sales", Math.round(value[0] * 10.0) / 10.0,
                "orders", (int) value[1]
        )));
        return rows;
    }

    private List<Map<String, Object>> buildStatusDistribution(List<Order> orders) {
        Map<Integer, String> labels = Map.of(
                1, "待付款",
                2, "已付款",
                3, "配送中",
                4, "已完成",
                5, "已取消"
        );
        Map<Integer, Long> counts = new LinkedHashMap<>();
        labels.keySet().forEach(key -> counts.put(key, 0L));
        for (Order order : orders) {
            Integer status = order.getStatus() == null ? 0 : order.getStatus();
            counts.put(status, counts.getOrDefault(status, 0L) + 1);
        }
        List<Map<String, Object>> rows = new ArrayList<>();
        counts.forEach((status, count) -> rows.add(Map.of(
                "label", labels.getOrDefault(status, "其他"),
                "value", count
        )));
        return rows;
    }

    private List<Map<String, Object>> buildPayTypeDistribution(List<Order> orders) {
        Map<Integer, String> labels = Map.of(
                1, "支付宝沙箱",
                2, "微信沙箱",
                3, "货到付款"
        );
        Map<Integer, Long> counts = new LinkedHashMap<>();
        labels.keySet().forEach(key -> counts.put(key, 0L));
        for (Order order : orders) {
            Integer paytype = order.getPaytype() == null ? 3 : order.getPaytype();
            counts.put(paytype, counts.getOrDefault(paytype, 0L) + 1);
        }
        List<Map<String, Object>> rows = new ArrayList<>();
        counts.forEach((paytype, count) -> rows.add(Map.of(
                "label", labels.getOrDefault(paytype, "其他"),
                "value", count
        )));
        return rows;
    }

    private List<Map<String, Object>> buildCategorySales(List<OrderItem> items, Map<Integer, Order> ordersById, Map<Integer, Goods> goodsById, Map<Integer, String> typeNames) {
        Map<String, Double> sales = new HashMap<>();
        Map<String, Integer> amounts = new HashMap<>();
        for (OrderItem item : items) {
            Order order = ordersById.get(item.getOrderId());
            if (!isPaidOrder(order)) {
                continue;
            }
            Goods goods = goodsById.get(item.getGoodsId());
            String name = goods == null ? "未分类" : typeNames.getOrDefault(goods.getTypeId(), "未分类");
            int amount = item.getAmount() == null ? 0 : item.getAmount();
            double price = item.getPrice() == null ? 0 : item.getPrice();
            amounts.merge(name, amount, Integer::sum);
            sales.merge(name, price * amount, Double::sum);
        }
        return sales.entrySet().stream()
                .sorted((a, b) -> Double.compare(b.getValue(), a.getValue()))
                .limit(8)
                .map(entry -> Map.<String, Object>of(
                        "label", entry.getKey(),
                        "sales", Math.round(entry.getValue() * 10.0) / 10.0,
                        "amount", amounts.getOrDefault(entry.getKey(), 0)
                ))
                .toList();
    }

    private List<Map<String, Object>> buildStockOverview(List<Goods> goods) {
        long empty = goods.stream().filter(item -> item.getStock() == null || item.getStock() <= 0).count();
        long low = goods.stream().filter(item -> item.getStock() != null && item.getStock() > 0 && item.getStock() <= 5).count();
        long enough = goods.stream().filter(item -> item.getStock() != null && item.getStock() > 5).count();
        return List.of(
                Map.of("label", "缺货", "value", empty),
                Map.of("label", "低库存", "value", low),
                Map.of("label", "库存充足", "value", enough)
        );
    }

    private List<Map<String, Object>> buildGoodsSalesRanking(Map<Integer, Double> goodsSales, Map<Integer, Goods> goodsById) {
        return goodsSales.entrySet().stream()
                .sorted((a, b) -> Double.compare(b.getValue(), a.getValue()))
                .limit(8)
                .map(entry -> {
                    Goods goods = goodsById.get(entry.getKey());
                    return Map.<String, Object>of(
                            "goodsId", entry.getKey(),
                            "name", goods == null ? "商品" + entry.getKey() : goods.getName(),
                            "sales", Math.round(entry.getValue() * 10.0) / 10.0
                    );
                })
                .toList();
    }

    @PostMapping("/orders/{id}/status/{status}")
    public Map<String, Object> updateOrderStatus(@PathVariable Integer id, @PathVariable Integer status) {
        Order order = orderService.getById(id);
        if (order == null) {
            return Map.of("success", false);
        }
        order.setStatus(status);
        orderService.updateById(order);
        return Map.of("success", true, "order", order);
    }

    @DeleteMapping("/orders/{id}")
    public Map<String, Object> deleteOrder(@PathVariable Integer id) {
        orderItemService.remove(new LambdaQueryWrapper<OrderItem>().eq(OrderItem::getOrderId, id));
        orderService.removeById(id);
        return Map.of("success", true);
    }
}
