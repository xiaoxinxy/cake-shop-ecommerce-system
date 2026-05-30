package com.taohq.cakeshop1.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("orderitem")
public class OrderItem {

    @TableId(type = IdType.AUTO)
    private Integer id;

    private Double price;

    private Integer amount;

    private Integer goodsId;

    private Integer orderId;
}
