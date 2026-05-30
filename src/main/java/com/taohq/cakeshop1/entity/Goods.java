package com.taohq.cakeshop1.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import lombok.Data;

@Data
public class Goods {

    @TableId(type = IdType.AUTO)
    private Integer id;

    private String name;

    private String cover;

    private String image1;

    private String image2;

    private Double price;

    private String intro;

    private Integer stock;

    private Integer typeId;
}
