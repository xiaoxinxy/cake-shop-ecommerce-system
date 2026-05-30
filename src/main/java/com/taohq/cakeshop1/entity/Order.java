package com.taohq.cakeshop1.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("`order`")
public class Order {

    @TableId(type = IdType.AUTO)
    private Integer id;

    private Double total;

    private Integer amount;

    private Integer status;

    private Integer paytype;

    private String name;

    private String phone;

    private String address;

    private LocalDateTime datetime;

    private Integer userId;
}
