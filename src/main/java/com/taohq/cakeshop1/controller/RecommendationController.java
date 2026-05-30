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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/recommendations")
public class RecommendationController {

    private final GoodsService goodsService;
    private final OrderService orderService;
    private final OrderItemService orderItemService;

    public RecommendationController(GoodsService goodsService,
                                    OrderService orderService,
                                    OrderItemService orderItemService) {
        this.goodsService = goodsService;
        this.orderService = orderService;
        this.orderItemService = orderItemService;
    }

    @GetMapping("/home")
    public Map<String, Object> home(HttpSession session,
                                    @RequestParam(defaultValue = "4") int size) {
        User user = (User) session.getAttribute("loginUser");
        RecommendationProfile profile = buildUserProfile(user);
        Map<Integer, Integer> saleScores = globalSaleScores();
        List<Goods> goods = goodsService.list().stream()
                .filter(item -> item.getId() != null)
                .filter(item -> !profile.boughtGoodsIds.contains(item.getId()))
                .sorted(homeComparator(profile.typeScores, saleScores))
                .limit(clamp(size))
                .toList();

        String basis = profile.hasOrders
                ? "根据你历史订单里常买的商品分类推荐"
                : "你还没有历史订单，先按全站热销和新品推荐";

        return Map.of("success", true, "basis", basis, "records", goods);
    }

    @GetMapping("/similar/{goodsId}")
    public Map<String, Object> similar(@PathVariable Integer goodsId,
                                       @RequestParam(defaultValue = "4") int size) {
        Goods current = goodsService.getById(goodsId);
        if (current == null) {
            return Map.of("success", false, "message", "商品不存在", "records", List.of());
        }

        Map<Integer, Integer> saleScores = globalSaleScores();
        List<Goods> goods = goodsService.list().stream()
                .filter(item -> item.getId() != null && !item.getId().equals(goodsId))
                .sorted(similarComparator(current, saleScores))
                .limit(clamp(size))
                .toList();

        return Map.of(
                "success", true,
                "basis", "优先推荐同分类、价格接近、销量较高的商品",
                "records", goods
        );
    }

    private RecommendationProfile buildUserProfile(User user) {
        RecommendationProfile profile = new RecommendationProfile();
        if (user == null || user.getId() == null) {
            return profile;
        }

        List<Integer> orderIds = orderService.list(new LambdaQueryWrapper<Order>()
                        .eq(Order::getUserId, user.getId()))
                .stream()
                .map(Order::getId)
                .toList();
        if (orderIds.isEmpty()) {
            return profile;
        }

        List<OrderItem> items = orderItemService.list(new LambdaQueryWrapper<OrderItem>()
                .in(OrderItem::getOrderId, orderIds));
        if (items.isEmpty()) {
            return profile;
        }

        Map<Integer, Goods> goodsById = new HashMap<>();
        goodsService.listByIds(items.stream().map(OrderItem::getGoodsId).toList())
                .forEach(goods -> goodsById.put(goods.getId(), goods));

        for (OrderItem item : items) {
            Goods goods = goodsById.get(item.getGoodsId());
            if (goods == null || goods.getTypeId() == null) {
                continue;
            }
            int amount = Math.max(1, item.getAmount() == null ? 1 : item.getAmount());
            profile.hasOrders = true;
            profile.boughtGoodsIds.add(goods.getId());
            profile.typeScores.merge(goods.getTypeId(), amount, Integer::sum);
        }
        return profile;
    }

    private Map<Integer, Integer> globalSaleScores() {
        Map<Integer, Integer> scores = new HashMap<>();
        orderItemService.list().forEach(item -> {
            if (item.getGoodsId() == null) {
                return;
            }
            int amount = Math.max(1, item.getAmount() == null ? 1 : item.getAmount());
            scores.merge(item.getGoodsId(), amount, Integer::sum);
        });
        return scores;
    }

    private Comparator<Goods> homeComparator(Map<Integer, Integer> typeScores,
                                             Map<Integer, Integer> saleScores) {
        return Comparator
                .comparingDouble((Goods goods) -> homeScore(goods, typeScores, saleScores))
                .reversed()
                .thenComparing(Goods::getId, Comparator.nullsLast(Comparator.reverseOrder()));
    }

    private double homeScore(Goods goods, Map<Integer, Integer> typeScores, Map<Integer, Integer> saleScores) {
        int typeScore = goods.getTypeId() == null ? 0 : typeScores.getOrDefault(goods.getTypeId(), 0);
        int saleScore = goods.getId() == null ? 0 : saleScores.getOrDefault(goods.getId(), 0);
        int stockScore = goods.getStock() == null || goods.getStock() > 0 ? 1 : -20;
        int newScore = goods.getId() == null ? 0 : goods.getId();
        return typeScore * 100.0 + saleScore * 20.0 + stockScore + newScore * 0.01;
    }

    private Comparator<Goods> similarComparator(Goods current, Map<Integer, Integer> saleScores) {
        return Comparator
                .comparingDouble((Goods goods) -> similarScore(current, goods, saleScores))
                .reversed()
                .thenComparing(Goods::getId, Comparator.nullsLast(Comparator.reverseOrder()));
    }

    private double similarScore(Goods current, Goods candidate, Map<Integer, Integer> saleScores) {
        double score = 0;
        if (current.getTypeId() != null && current.getTypeId().equals(candidate.getTypeId())) {
            score += 120;
        }
        score += Math.max(0, 30 - priceDistance(current, candidate));
        score += sharedNameScore(current.getName(), candidate.getName());
        if (candidate.getId() != null) {
            score += saleScores.getOrDefault(candidate.getId(), 0) * 5.0;
        }
        return score;
    }

    private double priceDistance(Goods left, Goods right) {
        double leftPrice = left.getPrice() == null ? 0 : left.getPrice();
        double rightPrice = right.getPrice() == null ? 0 : right.getPrice();
        return Math.abs(leftPrice - rightPrice);
    }

    private int sharedNameScore(String left, String right) {
        if (left == null || right == null) {
            return 0;
        }
        Set<Character> chars = new LinkedHashSet<>();
        for (char c : left.toCharArray()) {
            if (!Character.isWhitespace(c)) {
                chars.add(c);
            }
        }
        int score = 0;
        for (char c : right.toCharArray()) {
            if (chars.contains(c)) {
                score += 2;
            }
        }
        return Math.min(score, 20);
    }

    private int clamp(int size) {
        return Math.max(1, Math.min(size, 12));
    }

    private static class RecommendationProfile {
        private boolean hasOrders;
        private final Map<Integer, Integer> typeScores = new HashMap<>();
        private final Set<Integer> boughtGoodsIds = new HashSet<>();
    }
}
