package com.taohq.cakeshop1.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.taohq.cakeshop1.entity.Order;
import com.taohq.cakeshop1.mapper.OrderMapper;
import com.taohq.cakeshop1.service.OrderService;
import org.springframework.stereotype.Service;

@Service
public class OrderServiceImpl extends ServiceImpl<OrderMapper, Order> implements OrderService {
}
