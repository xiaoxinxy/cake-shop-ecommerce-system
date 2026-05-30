package com.taohq.cakeshop1.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.taohq.cakeshop1.entity.Goods;
import com.taohq.cakeshop1.mapper.GoodsMapper;
import com.taohq.cakeshop1.service.GoodsService;
import org.springframework.stereotype.Service;

@Service
public class GoodsServiceImpl extends ServiceImpl<GoodsMapper, Goods> implements GoodsService {
}
