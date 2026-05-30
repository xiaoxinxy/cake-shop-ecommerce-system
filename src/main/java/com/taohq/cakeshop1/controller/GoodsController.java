package com.taohq.cakeshop1.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.taohq.cakeshop1.entity.Goods;
import com.taohq.cakeshop1.entity.Recommend;
import com.taohq.cakeshop1.service.GoodsService;
import com.taohq.cakeshop1.service.RecommendService;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/goods")
public class GoodsController {

    private final GoodsService goodsService;
    private final RecommendService recommendService;

    public GoodsController(GoodsService goodsService, RecommendService recommendService) {
        this.goodsService = goodsService;
        this.recommendService = recommendService;
    }

    @GetMapping
    public Page<Goods> list(@RequestParam(defaultValue = "1") long current,
                            @RequestParam(defaultValue = "8") long size,
                            @RequestParam(required = false) String keyword,
                            @RequestParam(required = false) Integer typeid,
                            @RequestParam(required = false) Integer type,
                            @RequestParam(required = false) Double minPrice,
                            @RequestParam(required = false) Double maxPrice,
                            @RequestParam(required = false) String sort) {
        LambdaQueryWrapper<Goods> wrapper = new LambdaQueryWrapper<>();

        if (StringUtils.hasText(keyword)) {
            wrapper.like(Goods::getName, keyword);
        }
        if (typeid != null && typeid > 0) {
            wrapper.eq(Goods::getTypeId, typeid);
        }
        if (minPrice != null && minPrice >= 0) {
            wrapper.ge(Goods::getPrice, minPrice);
        }
        if (maxPrice != null && maxPrice >= 0) {
            wrapper.le(Goods::getPrice, maxPrice);
        }
        if (type != null) {
            List<Integer> ids = recommendService.list(new LambdaQueryWrapper<Recommend>()
                            .eq(Recommend::getType, type))
                    .stream()
                    .map(Recommend::getGoodsId)
                    .toList();
            if (ids.isEmpty()) {
                wrapper.eq(Goods::getId, -1);
            } else {
                wrapper.in(Goods::getId, ids);
            }
        }

        if ("priceAsc".equals(sort)) {
            wrapper.orderByAsc(Goods::getPrice).orderByDesc(Goods::getId);
        } else if ("priceDesc".equals(sort)) {
            wrapper.orderByDesc(Goods::getPrice).orderByDesc(Goods::getId);
        } else {
            wrapper.orderByDesc(Goods::getId);
        }

        return goodsService.page(new Page<>(current, size), wrapper);
    }

    @GetMapping("/{id}")
    public Goods detail(@PathVariable Integer id) {
        return goodsService.getById(id);
    }

    @GetMapping("/batch")
    public List<Goods> batch(@RequestParam String ids) {
        List<Integer> goodsIds = Arrays.stream(ids.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .map(Integer::valueOf)
                .toList();
        if (goodsIds.isEmpty()) {
            return List.of();
        }
        return goodsService.listByIds(goodsIds);
    }
}
