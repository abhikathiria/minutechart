// using System;
// using System.Collections.Generic;
// using System.ComponentModel.DataAnnotations;
// using System.ComponentModel.DataAnnotations.Schema;

// namespace minutechart.Models
// {
//     public class Order
//     {
//         [Key]
//         public int OrderID { get; set; }

//         [Required]
//         public int CustomerID { get; set; }

//         public DateTime OrderDate { get; set; } = DateTime.Now;

//         public DateTime? ShippingDate { get; set; }

//         public DateTime? DeliveryDate { get; set; }

//         [Required]
//         [Column(TypeName = "decimal(15,2)")]
//         public decimal TotalAmount { get; set; }

//         [Column(TypeName = "decimal(10,2)")]
//         public decimal ShippingAmount { get; set; } = 100;

//         public string? CouponCode { get; set; }

//         [Column(TypeName = "decimal(10,2)")]
//         public decimal DiscountApplied { get; set; } = 0;

//         [Required]
//         [Column(TypeName = "decimal(15,2)")]
//         public decimal FinalAmount { get; set; }

//         [Required]
//         [StringLength(20)]
//         [EnumDataType(typeof(OrderStatusEnum))] // Restricting values
//         public string OrderStatus { get; set; } = OrderStatusEnum.PENDING.ToString();

//         [Required]
//         [StringLength(20)]
//         [EnumDataType(typeof(PaymentMethodEnum))] // Restricting values
//         public string PaymentMethod { get; set; } = PaymentMethodEnum.COD.ToString();

//         // Navigation Properties
//         public virtual Customer Customer { get; set; }

//         public virtual ICollection<OrderDetail>? OrderDetails { get; set; }
//         public virtual Coupon Coupon { get; set; }

//         public enum OrderStatusEnum
//         {
//             PENDING,
//             SHIPPED,
//             DELIVERED,
//             CANCELLED
//         }

//         // Enum for Payment Methods
//         public enum PaymentMethodEnum
//         {
//             COD,
//             UPI,
//             CARD
//         }
//     }
// }