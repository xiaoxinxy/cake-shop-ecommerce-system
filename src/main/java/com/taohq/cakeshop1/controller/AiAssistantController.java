package com.taohq.cakeshop1.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taohq.cakeshop1.entity.Goods;
import com.taohq.cakeshop1.entity.Type;
import com.taohq.cakeshop1.entity.User;
import com.taohq.cakeshop1.service.GoodsService;
import com.taohq.cakeshop1.service.TypeService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/assistant")
public class AiAssistantController {

    private final GoodsService goodsService;
    private final TypeService typeService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${assistant.ollama.base-url:http://localhost:11434}")
    private String ollamaBaseUrl;

    @Value("${assistant.ollama.model:qwen2:7b}")
    private String ollamaModel;

    @Value("${assistant.ollama.timeout-seconds:90}")
    private int ollamaTimeoutSeconds;

    public AiAssistantController(GoodsService goodsService, TypeService typeService, ObjectMapper objectMapper) {
        this.goodsService = goodsService;
        this.typeService = typeService;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    @PostMapping("/chat")
    public Map<String, Object> chat(@RequestBody ChatRequest request, HttpSession session) {
        String message = request == null ? "" : request.message;
        if (message == null || message.isBlank()) {
            return Map.of("success", false, "answer", "请先输入你想咨询的问题。");
        }

        String prompt = systemPrompt(session);
        try {
            String answer = askOllama(prompt, message);
            return Map.of("success", true, "model", ollamaModel, "answer", answer);
        } catch (Exception ex) {
            String answer = fallbackAnswer(message, session);
            return Map.of(
                    "success", true,
                    "model", ollamaModel,
                    "fallback", true,
                    "answer", answer,
                    "error", ex.getMessage() == null ? "local model unavailable" : ex.getMessage()
            );
        }
    }

    private String askOllama(String systemPrompt, String userMessage) throws Exception {
        Map<String, Object> body = Map.of(
                "model", ollamaModel,
                "stream", false,
                "keep_alive", "10m",
                "options", Map.of(
                        "num_predict", 256,
                        "temperature", 0.4
                ),
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userMessage)
                )
        );

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(trimRightSlash(ollamaBaseUrl) + "/api/chat"))
                .timeout(Duration.ofSeconds(Math.max(20, ollamaTimeoutSeconds)))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("Ollama returned HTTP " + response.statusCode());
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode content = root.path("message").path("content");
        if (content.isMissingNode() || content.asText().isBlank()) {
            throw new IllegalStateException("Ollama response has no message content");
        }
        return content.asText();
    }

    private String fallbackAnswer(String message, HttpSession session) {
        String text = message == null ? "" : message.trim();
        if (text.contains("订单")) {
            User user = (User) session.getAttribute("loginUser");
            if (user == null) {
                return "你还没有登录。查看订单或提交订单需要先登录，然后进入“我的订单”页面查看。";
            }
            return "你可以在顶部导航进入“我的订单”查看订单状态。订单状态包括待付款、已付款、配送中、已完成。";
        }
        if (text.contains("购物车") || text.contains("下单")) {
            return "把喜欢的商品加入购物车后，进入购物车页面确认数量，再点击结算并填写收货人、电话、地址和支付方式即可下单。";
        }
        if (text.contains("分类") || text.contains("系列")) {
            return "商城目前有冰淇淋系列、零食系列、儿童系列、法式系列、经典系列、节日系列等分类，你可以在导航栏的商品分类里查看。";
        }
        if (text.contains("推荐") || text.contains("好吃") || text.contains("买")) {
            return "我根据商城里的商品给你推荐：\n" + recommendGoodsText();
        }
        if (text.contains("价格") || text.contains("多少钱")) {
            return "不同商品价格不一样，你可以在商品卡片和详情页看到价格。比如：\n" + recommendGoodsText();
        }
        return "本地大模型暂时没有响应，我先用商城数据回答你：可以咨询商品推荐、分类、价格、购物车、下单和订单问题。你也可以问“推荐一些蛋糕”。";
    }

    private String recommendGoodsText() {
        List<Goods> goods = goodsService.list(new LambdaQueryWrapper<Goods>()
                .orderByDesc(Goods::getId)
                .last("limit 4"));
        if (goods.isEmpty()) {
            return "暂时没有可推荐商品，请先确认数据库已导入商品数据。";
        }
        List<String> rows = new ArrayList<>();
        for (Goods item : goods) {
            rows.add(item.getName() + "，价格 " + item.getPrice() + " 元，库存 " + item.getStock());
        }
        return String.join("\n", rows);
    }

    private String systemPrompt(HttpSession session) {
        User user = (User) session.getAttribute("loginUser");
        StringBuilder prompt = new StringBuilder();
        prompt.append("你是 CakeShop 蛋糕商城的中文 AI 小助手。");
        prompt.append("只回答与本商城、商品、分类、价格、库存、下单、购物车、订单、配送、售后相关的问题。");
        prompt.append("回答要简短、自然，必要时推荐具体商品。不要编造不存在的功能。");
        if (user != null) {
            prompt.append("当前登录用户：").append(safe(user.getUsername())).append("。");
        } else {
            prompt.append("当前用户未登录，涉及订单和下单时提醒先登录。");
        }
        prompt.append("\n商品分类：").append(typeSummary());
        prompt.append("\n可参考商品：").append(goodsSummary());
        return prompt.toString();
    }

    private String typeSummary() {
        List<Type> types = typeService.list(new LambdaQueryWrapper<Type>().orderByAsc(Type::getId));
        if (types.isEmpty()) {
            return "暂无分类";
        }
        List<String> rows = new ArrayList<>();
        for (Type type : types) {
            rows.add(type.getId() + "-" + safe(type.getName()));
        }
        return String.join("；", rows);
    }

    private String goodsSummary() {
        List<Goods> goods = goodsService.list(new LambdaQueryWrapper<Goods>()
                .orderByDesc(Goods::getId)
                .last("limit 20"));
        if (goods.isEmpty()) {
            return "暂无商品";
        }
        List<String> rows = new ArrayList<>();
        for (Goods item : goods) {
            rows.add(item.getId() + "." + safe(item.getName())
                    + "，价格" + item.getPrice()
                    + "，库存" + item.getStock()
                    + "，分类ID" + item.getTypeId());
        }
        return String.join("；", rows);
    }

    private String safe(String value) {
        return value == null ? "" : value.replaceAll("\\s+", " ").trim();
    }

    private String trimRightSlash(String value) {
        if (value == null || value.isBlank()) {
            return "http://localhost:11434";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    public static class ChatRequest {
        public String message;
    }
}
