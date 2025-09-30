import React, { useEffect, useState } from "react";
import axios from "axios";
import api from "../../api";

const ProductList = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get("/product")
      .then((res) => setProducts(res.data))
      .catch((err) => console.error("Error fetching product data:", err));
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {products.map((product) => (
        <div key={product.productID} className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-bold mb-1">{product.productName}</h2>
          <p className="text-gray-500 text-sm mb-2">SKU: {product.productSKU}</p>
          
          <div className="text-sm mb-2">
            <strong>Color:</strong> {product.productColor} | <strong>Size:</strong> {product.productSize}
          </div>

          <p className="text-gray-700 text-sm mb-2">
            {product.productDescription}
          </p>

          {product.keyFeatures && (
            <ul className="list-disc text-sm pl-5 mb-2 text-gray-600">
              {product.keyFeatures.split(",").map((feature, index) => (
                <li key={index}>{feature.trim()}</li>
              ))}
            </ul>
          )}

          <div className="flex justify-between text-sm font-medium mt-4">
            <span>Price: ₹{product.unitPrice}</span>
            <span>Cost: ₹{product.productionCost}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductList;
