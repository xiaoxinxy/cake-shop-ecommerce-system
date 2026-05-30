package com.taohq.cakeshop1.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.taohq.cakeshop1.entity.Type;
import com.taohq.cakeshop1.mapper.TypeMapper;
import com.taohq.cakeshop1.service.TypeService;
import org.springframework.stereotype.Service;

@Service
public class TypeServiceImpl extends ServiceImpl<TypeMapper, Type> implements TypeService {
}
