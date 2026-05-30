package com.taohq.cakeshop1.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import lombok.Data;

@Data
public class Recommend {

    @TableId(type = IdType.AUTO)
    private Integer id;

    private Integer type;

    private Integer goodsId;
}
