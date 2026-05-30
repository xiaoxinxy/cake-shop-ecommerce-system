package com.taohq.cakeshop1.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.taohq.cakeshop1.entity.Goods;
import com.taohq.cakeshop1.entity.Order;
import com.taohq.cakeshop1.entity.OrderItem;
import com.taohq.cakeshop1.entity.User;
import com.taohq.cakeshop1.service.GoodsService;
import com.taohq.cakeshop1.service.OrderItemService;
import com.taohq.cakeshop1.service.OrderService;
import jakarta.servlet.http.HttpSession;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;
    private final OrderItemService orderItemService;
    private final GoodsService goodsService;

    public OrderController(OrderService orderService, OrderItemService orderItemService, GoodsService goodsService) {
        this.orderService = orderService;
        this.orderItemService = orderItemService;
        this.goodsService = goodsService;
    }

    @GetMapping
    public List<Map<String, Object>> list(HttpSession session) {
        User user = (User) session.getAttribute("loginUser");
        LambdaQueryWrapper<Order> wrapper = new LambdaQueryWrapper<Order>().orderByDesc(Order::getId);
        if (user != null && !Boolean.TRUE.equals(user.getIsadmin())) {
            wrapper.eq(Order::getUserId, user.getId());
        }
        return orderService.list(wrapper).stream().map(this::detailMap).toList();
    }

    @GetMapping("/{id}")
    public Map<String, Object> detail(@PathVariable Integer id) {
        Order order = orderService.getById(id);
        return order == null ? Map.of("success", false, "message", "订单不存在") : detailMap(order);
    }

    @GetMapping("/{id}/tracking")
    public Map<String, Object> tracking(@PathVariable Integer id, HttpSession session) {
        User user = (User) session.getAttribute("loginUser");
        Order order = orderService.getById(id);
        if (user == null) {
            return Map.of("success", false, "message", "请先登录");
        }
        if (order == null) {
            return Map.of("success", false, "message", "订单不存在");
        }
        if (!Boolean.TRUE.equals(user.getIsadmin()) && !user.getId().equals(order.getUserId())) {
            return Map.of("success", false, "message", "无权查看该订单");
        }
        int status = order.getStatus() == null ? 1 : order.getStatus();
        List<Map<String, Object>> steps = List.of(
                Map.of("name", "提交订单", "done", status >= 1, "time", order.getDatetime() == null ? "" : order.getDatetime().toString()),
                Map.of("name", "完成支付", "done", status >= 2 && status < 5, "time", status >= 2 && status < 5 ? "沙箱支付已确认" : "等待支付"),
                Map.of("name", "商家备货", "done", status >= 3 && status < 5, "time", status >= 3 && status < 5 ? "后台已发货" : "等待商家处理"),
                Map.of("name", "配送中", "done", status >= 3 && status < 5, "time", status >= 3 && status < 5 ? "配送员正在送达" : "等待配送"),
                Map.of("name", "订单完成", "done", status >= 4 && status < 5, "time", status >= 4 && status < 5 ? "订单已完成" : "等待收货")
        );
        return Map.of(
                "success", true,
                "order", order,
                "cancelled", status == 5,
                "trackingNo", "CS" + order.getId() + "HY" + (order.getUserId() == null ? 0 : order.getUserId()),
                "carrier", "CakeShop 校园配送",
                "steps", steps
        );
    }

    @PostMapping
    @Transactional
    public Map<String, Object> create(@RequestBody OrderRequest request, HttpSession session) {
        User user = (User) session.getAttribute("loginUser");
        if (user == null) {
            return Map.of("success", false, "message", "请先登录");
        }
        if (request.items == null || request.items.isEmpty()) {
            return Map.of("success", false, "message", "购物车为空");
        }

        Order order = new Order();
        order.setName(valueOrDefault(request.name, user.getName()));
        order.setPhone(valueOrDefault(request.phone, user.getPhone()));
        order.setAddress(valueOrDefault(request.address, user.getAddress()));
        order.setPaytype(request.paytype == null ? 1 : request.paytype);
        order.setStatus(1);
        order.setDatetime(LocalDateTime.now());
        order.setUserId(user.getId());

        double total = 0;
        int amount = 0;
        List<OrderItem> orderItems = new ArrayList<>();
        List<Goods> boughtGoods = new ArrayList<>();
        for (OrderItemRequest itemRequest : request.items) {
            Goods goods = goodsService.getById(itemRequest.goodsId);
            if (goods == null) {
                continue;
            }
            int count = Math.max(1, itemRequest.amount == null ? 1 : itemRequest.amount);
            if (goods.getStock() == null || goods.getStock() < count) {
                return Map.of("success", false, "message", goods.getName() + "库存不足");
            }
            OrderItem item = new OrderItem();
            item.setGoodsId(goods.getId());
            item.setPrice(goods.getPrice());
            item.setAmount(count);
            orderItems.add(item);
            boughtGoods.add(goods);
            total += goods.getPrice() * count;
            amount += count;
        }

        if (orderItems.isEmpty()) {
            return Map.of("success", false, "message", "商品不存在");
        }

        double discount = couponDiscount(request.couponCode, total);
        order.setTotal(Math.max(0, total - discount));
        order.setAmount(amount);
        orderService.save(order);
        for (int i = 0; i < orderItems.size(); i++) {
            OrderItem item = orderItems.get(i);
            Goods goods = boughtGoods.get(i);
            goods.setStock(goods.getStock() - item.getAmount());
            goodsService.updateById(goods);
            item.setOrderId(order.getId());
            orderItemService.save(item);
        }
        return Map.of(
                "success", true,
                "message", discount > 0 ? "下单成功，已优惠" + discount + "元" : "下单成功",
                "orderId", order.getId(),
                "paytype", order.getPaytype(),
                "total", order.getTotal(),
                "discount", discount
        );
    }

    @PostMapping("/{id}/cancel")
    @Transactional
    public Map<String, Object> cancel(@PathVariable Integer id, HttpSession session) {
        User user = (User) session.getAttribute("loginUser");
        Order order = orderService.getById(id);
        if (user == null) {
            return Map.of("success", false, "message", "请先登录");
        }
        if (order == null) {
            return Map.of("success", false, "message", "订单不存在");
        }
        if (!Boolean.TRUE.equals(user.getIsadmin()) && !user.getId().equals(order.getUserId())) {
            return Map.of("success", false, "message", "无权取消该订单");
        }
        if (order.getStatus() != null && order.getStatus() > 1) {
            return Map.of("success", false, "message", "已付款或已处理订单不能取消");
        }

        List<OrderItem> items = orderItemService.list(new LambdaQueryWrapper<OrderItem>()
                .eq(OrderItem::getOrderId, order.getId()));
        for (OrderItem item : items) {
            Goods goods = goodsService.getById(item.getGoodsId());
            if (goods != null) {
                goods.setStock((goods.getStock() == null ? 0 : goods.getStock()) + item.getAmount());
                goodsService.updateById(goods);
            }
        }
        order.setStatus(5);
        orderService.updateById(order);
        return Map.of("success", true, "message", "订单已取消");
    }

    private Map<String, Object> detailMap(Order order) {
        Map<String, Object> map = new HashMap<>();
        map.put("order", order);
        List<OrderItem> items = orderItemService.list(new LambdaQueryWrapper<OrderItem>()
                .eq(OrderItem::getOrderId, order.getId()));
        List<Map<String, Object>> details = items.stream().map(item -> {
            Map<String, Object> row = new HashMap<>();
            row.put("item", item);
            row.put("goods", goodsService.getById(item.getGoodsId()));
            return row;
        }).toList();
        map.put("items", details);
        return map;
    }

    private String valueOrDefault(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value;
    }

    private double couponDiscount(String couponCode, double total) {
        if (couponCode == null || couponCode.isBlank()) {
            return 0;
        }
        String code = couponCode.trim().toUpperCase();
        if ("CAKE10".equals(code) && total >= 50) {
            return 10;
        }
        if ("NEW20".equals(code) && total >= 100) {
            return 20;
        }
        return 0;
    }

    public static class OrderRequest {
        public String name;
        public String phone;
        public String address;
        public Integer paytype;
        public String couponCode;
        public List<OrderItemRequest> items;
    }

    public static class OrderItemRequest {
        public Integer goodsId;
        public Integer amount;
    }
}
