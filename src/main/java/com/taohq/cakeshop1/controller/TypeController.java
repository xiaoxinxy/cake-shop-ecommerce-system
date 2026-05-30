package com.taohq.cakeshop1.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.taohq.cakeshop1.entity.Type;
import com.taohq.cakeshop1.service.TypeService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/types")
public class TypeController {

    private final TypeService typeService;

    public TypeController(TypeService typeService) {
        this.typeService = typeService;
    }

    @GetMapping
    public List<Type> list() {
        return typeService.list(new LambdaQueryWrapper<Type>().orderByAsc(Type::getId));
    }
}
