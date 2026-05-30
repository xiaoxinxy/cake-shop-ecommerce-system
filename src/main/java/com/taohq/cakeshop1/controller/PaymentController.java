package com.taohq.cakeshop1.controller;

import com.taohq.cakeshop1.entity.Order;
import com.taohq.cakeshop1.entity.User;
import com.taohq.cakeshop1.service.OrderService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final OrderService orderService;

    @Value("${payment.sandbox.enabled:true}")
    private boolean sandboxEnabled;

    public PaymentController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping("/{orderId}")
    public Map<String, Object> create(@PathVariable Integer orderId,
                                      @RequestParam(required = false) Integer payType,
                                      HttpSession session) {
        User user = (User) session.getAttribute("loginUser");
        Order order = orderService.getById(orderId);
        if (user == null) {
            return Map.of("success", false, "message", "请先登录");
        }
        if (order == null) {
            return Map.of("success", false, "message", "订单不存在");
        }
        if (order.getStatus() != null && order.getStatus() == 5) {
            return Map.of("success", false, "message", "订单已取消，不能继续支付");
        }
        if (!Boolean.TRUE.equals(user.getIsadmin()) && !user.getId().equals(order.getUserId())) {
            return Map.of("success", false, "message", "无权支付该订单");
        }
        if (payType != null && (payType == 1 || payType == 2)) {
            order.setPaytype(payType);
            orderService.updateById(order);
        }

        int channel = order.getPaytype() == null ? 1 : order.getPaytype();
        String channelName = channel == 2 ? "微信支付沙箱" : "支付宝沙箱";
        String prefix = channel == 2 ? "WXPAY-SANDBOX" : "ALIPAY-SANDBOX";
        String tradeNo = prefix + "-" + order.getId() + "-"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String qrText = channelName + "|订单号:" + order.getId() + "|金额:" + order.getTotal() + "|交易号:" + tradeNo;

        return Map.of(
                "success", true,
                "sandbox", sandboxEnabled,
                "paid", order.getStatus() != null && order.getStatus() >= 2 && order.getStatus() < 5,
                "orderId", order.getId(),
                "amount", order.getTotal(),
                "payType", channel,
                "channelName", channelName,
                "tradeNo", tradeNo,
                "qrText", qrText,
                "message", "沙箱模式不会产生真实扣款，可点击确认按钮模拟支付回调"
        );
    }

    @PostMapping("/{orderId}/confirm")
    public Map<String, Object> confirm(@PathVariable Integer orderId, HttpSession session) {
        User user = (User) session.getAttribute("loginUser");
        Order order = orderService.getById(orderId);
        if (user == null) {
            return Map.of("success", false, "message", "请先登录");
        }
        if (order == null) {
            return Map.of("success", false, "message", "订单不存在");
        }
        if (!Boolean.TRUE.equals(user.getIsadmin()) && !user.getId().equals(order.getUserId())) {
            return Map.of("success", false, "message", "无权支付该订单");
        }
        if (order.getStatus() != null && order.getStatus() == 5) {
            return Map.of("success", false, "message", "订单已取消，不能继续支付");
        }
        if (order.getStatus() != null && order.getStatus() >= 2) {
            return Map.of("success", true, "message", "订单已付款", "order", order);
        }
        order.setStatus(2);
        orderService.updateById(order);
        return Map.of("success", true, "message", "沙箱支付成功，订单已更新为已付款", "order", order);
    }
}
