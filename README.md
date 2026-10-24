# Hospital Inventory Management System

A microservices-based hospital inventory management system designed to streamline inventory monitoring, procurement, delivery tracking, and supplier coordination. The system also incorporates an AI-powered inventory forecasting concept using a custom-trained model developed with Microsoft Azure Machine Learning to estimate stock depletion and recommend appropriate reorder quantities.

## 📌 Overview

The **Hospital Inventory Management System** is a web-based application developed to help hospitals manage medical supplies, monitor inventory levels, track deliveries, and coordinate supply orders with suppliers.

Built using a microservices architecture, the system separates key application functions into dedicated services to support modular development and maintainability. Hospital personnel can monitor available supplies, identify low-stock items, and place orders when replenishment is needed.

The system also provides a separate supplier interface where suppliers can view hospital orders and receive notifications when the hospital places an order. This helps improve communication between hospitals and suppliers throughout the procurement process.

In addition to the core inventory management features, I independently trained an AI model using Microsoft Azure Machine Learning and worked on integrating it into the application. The model is intended to analyze inventory usage, estimate the remaining days before supplies run out, and recommend suitable reorder quantities based on consumption patterns.


## ✨ Key Features

### 📦 Inventory Management
- Monitor hospital supply inventory and available stock levels.
- Identify supplies that are running low.
- Maintain organized inventory records.
- Support inventory monitoring and replenishment planning.

### 🚚 Delivery Tracking
- Track deliveries of ordered hospital supplies.
- Monitor incoming supplies associated with procurement orders.
- Support better visibility into the supply replenishment process.

### 🛒 Procurement and Supplier Management
- Place orders for hospital supplies when replenishment is needed.
- Provide a dedicated interface for suppliers.
- Allow suppliers to view orders placed by the hospital.
- Notify suppliers when the hospital submits a new order.
- Improve coordination between hospital inventory management and suppliers.

### 🤖 AI-Powered Inventory Forecasting
- Independently train an AI model using Microsoft Azure Machine Learning.
- Use inventory usage data to estimate when supplies may run out.
- Estimate the remaining days of stock based on consumption patterns.
- Recommend reorder quantities based on inventory usage.
- Aim to reduce stock shortages and avoid unnecessary overstocking.


## 🏗️ System Architecture

The application follows a **microservices architecture**, organizing functionality into separate services for authentication, inventory management, procurement, and other application workflows.

The repository includes service directories such as:

- **API Gateway (`gateway`)** — Gateway component for requests to backend services.
- **Authentication Service (`auth-svc`)** — Authentication-related functionality.
- **Inventory Service (`inventory-svc`)** — Hospital inventory management.
- **Procurement Service (`procurement-svc`)** — Supply ordering and procurement workflows.
- **Hospital Web (`hospital-web`)** — Hospital-facing web application.
- **Additional Services** — Supporting services for other system workflows.

This structure helps separate business responsibilities and makes the application easier to develop and maintain by organizing functionality into distinct components.

## 🧠 AI Model Development

One of the project's key components is an AI model that I trained independently using **Microsoft Azure Machine Learning**.

I supplied data for model training and testing, developed the model through Azure Machine Learning, and worked on integrating it into the hospital inventory management system.

The intended capabilities of the model include:

- **Stock Depletion Estimation:** Estimate how many days of supply remain based on inventory usage.
- **Inventory Forecasting:** Help anticipate potential stock shortages.
- **Reorder Recommendations:** Suggest appropriate order quantities based on consumption patterns.
- **Inventory Optimization:** Support better replenishment decisions and help avoid excessive ordering.

The goal is to move beyond simply displaying current stock levels by exploring how predictive analytics can help hospital personnel make more informed inventory decisions.

**Current status:** The AI model integration is still under development and is not yet ready for production use. Its predictions and recommendations require further testing and validation.

## 🛠️ Technology Stack

- **Frontend:** TypeScript
- **Backend:** JavaScript
- **Runtime:** Node.js
- **Database:** PostgreSQL
- **Architecture:** Microservices
- **API Gateway:** Gateway component for backend service requests
- **AI Model Training:** Microsoft Azure Machine Learning
- **AI Integration:** Custom-trained model for inventory forecasting and reorder recommendations


## 🎯 Project Objectives

- Improve hospital inventory monitoring and organization.
- Streamline procurement and supplier ordering workflows.
- Improve visibility into incoming deliveries and supply availability.
- Explore AI-based forecasting to anticipate stock depletion.
- Recommend reorder quantities based on inventory consumption.
- Apply microservices architecture to organize application functionality.

## 🚧 Development Status

The core inventory management, procurement, and supplier-related application workflows have been developed.

The AI-based stock forecasting and reorder recommendation functionality remains under development. Additional testing, integration work, and model validation are needed before its predictions can be relied upon in real-world hospital operations.

## 👨‍💻 Project Highlights

This project demonstrates my practical experience in:

- Frontend development using TypeScript.
- Backend development using JavaScript and Node.js.
- Relational database management using PostgreSQL.
- Designing and developing applications with a microservices architecture.
- Implementing inventory and procurement workflows.
- Training an AI model using Microsoft Azure Machine Learning.
- Integrating a custom-trained AI model into a software application.

## 📁 Project Structure

```text
capstone-node/
├── .github/
├── alms-svc/
├── auth-svc/
├── docs/
├── dtrs-svc/
├── gateway/
├── hospital-web/
├── inventory-svc/
├── jobs/
├── plt-svc/
├── procurement-svc/
├── tests/
├── .gitignore
├── .hintrc
├── ecosystem.config.js
├── env.stack.test
├── jest.config.js
└── ...
```

Each service directory contains components associated with a particular part of the application. Refer to the individual service configuration files and project documentation for implementation details.
