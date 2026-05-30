package com.taohq.cakeshop1.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.taohq.cakeshop1.entity.Order;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface OrderMapper extends BaseMapper<Order> {
}
