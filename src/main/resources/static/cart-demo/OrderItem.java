package com.huoll.entity;

public class OrderItem
{
    private Integer id;
    private float price;//good价格
    private Integer amount;//同一个good的数量
    private Integer goods_id;
    private Integer order_id;
    private Goods goods;

    //无参构造函数
    public OrderItem() {
    }

    //带参构造函数
    public OrderItem(float price, Integer amount, Integer goods_id, Integer order_id, Goods goods) {
        this.price = price;
        this.amount = amount;
        this.goods_id = goods_id;
        this.order_id = order_id;
        this.goods = goods;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public float getPrice() {
        return price;
    }

    public void setPrice(float price) {
        this.price = price;
    }

    public Integer getAmount() {
        return amount;
    }

    public void setAmount(Integer amount) {
        this.amount = amount;
    }

    public Integer getGoods_id() {
        return goods_id;
    }

    public void setGoods_id(Integer goods_id) {
        this.goods_id = goods_id;
    }

    public Goods getGoods() {
        return goods;
    }

    public void setGoods(Goods goods) {
        this.goods = goods;
    }

    public Integer getOrder_id() {
        return order_id;
    }

    public void setOrder_id(Integer order_id) {
        this.order_id = order_id;
    }

    @Override
    public String toString() {
        return "OrderItem{" +
                "id=" + id +
                ", price=" + price +
                ", amount=" + amount +
                ", goods_id=" + goods_id +
                ", goods=" + goods +
                '}';
    }
}
