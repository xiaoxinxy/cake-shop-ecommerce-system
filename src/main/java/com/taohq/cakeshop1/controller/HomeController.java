package com.taohq.cakeshop1.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.Map;

@Controller
public class HomeController {

    @GetMapping("/")
    public String index() {
        return "redirect:/front/index.html";
    }

    @GetMapping("/index")
    public String oldIndex() {
        return "redirect:/front/index.html";
    }

    @GetMapping("/goods_list")
    public String goodsList(@RequestParam Map<String, String> params) {
        if ("recommend".equals(params.get("flag")) && params.containsKey("type")) {
            return redirectGoodsList("type", params.get("type"), params.get("pageNumber"));
        }
        if (params.containsKey("typeid")) {
            return redirectGoodsList("typeid", params.get("typeid"), params.get("pageNumber"));
        }
        return redirectGoodsList(null, null, params.get("pageNumber"));
    }

    @GetMapping("/goodslist")
    public String oldGoodsList(@RequestParam Map<String, String> params) {
        if ("recommend".equals(params.get("flag")) && params.containsKey("type")) {
            return redirectGoodsList("type", params.get("type"), params.get("pageNumber"));
        }
        if (params.containsKey("typeid")) {
            return redirectGoodsList("typeid", params.get("typeid"), params.get("pageNumber"));
        }
        return redirectGoodsList(null, null, params.get("pageNumber"));
    }

    @GetMapping("/goodsrecommend_list")
    public String goodsRecommend(@RequestParam(defaultValue = "2") String type,
                                 @RequestParam(required = false) String pageNumber) {
        return redirectGoodsList("type", type, pageNumber);
    }

    @GetMapping("/goods_detail")
    public String goodsDetail(@RequestParam(required = false) String id) {
        if (id != null && !id.isBlank()) {
            return "redirect:/front/goods_detail.html?id=" + id;
        }
        return "redirect:/front/goods_detail.html";
    }

    @GetMapping({"/user_login.jsp", "/user_login", "/login"})
    public String login() {
        return "redirect:/front/login.html";
    }

    @GetMapping({"/user_register.jsp", "/register"})
    public String register() {
        return "redirect:/front/user_register.html";
    }

    @GetMapping({"/goods_cart.jsp", "/goods_cart"})
    public String cart() {
        return "redirect:/front/goods_cart.html";
    }

    @GetMapping("/order_list")
    public String orderList() {
        return "redirect:/front/order_list.html";
    }

    @GetMapping("/order_submit")
    public String orderSubmit() {
        return "redirect:/front/order_submit.html";
    }

    @GetMapping("/pay")
    public String pay(@RequestParam(required = false) String orderId) {
        if (orderId != null && !orderId.isBlank()) {
            return "redirect:/front/pay.html?orderId=" + orderId;
        }
        return "redirect:/front/order_list.html";
    }

    @GetMapping("/tracking")
    public String tracking(@RequestParam(required = false) String orderId) {
        if (orderId != null && !orderId.isBlank()) {
            return "redirect:/front/tracking.html?orderId=" + orderId;
        }
        return "redirect:/front/order_list.html";
    }

    @GetMapping({"/admin", "/admin/index"})
    public String admin() {
        return "redirect:/admin/dashboard.html";
    }

    @GetMapping({"/message", "/user", "/user_logout", "/order_confirm"})
    public String notImplemented() {
        return "redirect:/front/index.html";
    }

    @PostMapping({"/user_login", "/user_register", "/user_changeaddress", "/user_changepwd", "/order_confirm"})
    public String formSubmit() {
        return "redirect:/front/index.html";
    }

    private String redirectGoodsList(String key, String value, String pageNumber) {
        StringBuilder target = new StringBuilder("redirect:/front/goodslist.html");
        boolean hasQuery = false;
        if (key != null && value != null) {
            target.append("?").append(key).append("=").append(value);
            hasQuery = true;
        }
        if (pageNumber != null && !pageNumber.isBlank()) {
            target.append(hasQuery ? "&" : "?").append("pageNumber=").append(pageNumber);
        }
        return target.toString();
    }
}
