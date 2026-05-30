package com.taohq.cakeshop1.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.taohq.cakeshop1.entity.OrderItem;
import com.taohq.cakeshop1.mapper.OrderItemMapper;
import com.taohq.cakeshop1.service.OrderItemService;
import org.springframework.stereotype.Service;

@Service
public class OrderItemServiceImpl extends ServiceImpl<OrderItemMapper, OrderItem> implements OrderItemService {
}
