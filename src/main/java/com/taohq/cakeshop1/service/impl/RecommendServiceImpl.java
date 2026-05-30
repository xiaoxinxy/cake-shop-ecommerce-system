package com.taohq.cakeshop1.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.taohq.cakeshop1.entity.Recommend;
import com.taohq.cakeshop1.mapper.RecommendMapper;
import com.taohq.cakeshop1.service.RecommendService;
import org.springframework.stereotype.Service;

@Service
public class RecommendServiceImpl extends ServiceImpl<RecommendMapper, Recommend> implements RecommendService {
}
