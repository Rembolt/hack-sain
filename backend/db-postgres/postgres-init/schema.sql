CREATE TABLE billing (
    billing_id VARCHAR(50) PRIMARY KEY,
    account_id VARCHAR(50) NOT NULL,

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    water_m3 DECIMAL(10,2),
    electricity_kwh DECIMAL(10,2),

    water_charge DECIMAL(10,2),
    electricity_charge DECIMAL(10,2),
    service_fee DECIMAL(10,2),
    adjustments DECIMAL(10,2),
    tax DECIMAL(10,2),

    total_price DECIMAL(10,2),

    currency VARCHAR(10),
    status VARCHAR(20),

    issued_date DATE,
    due_date DATE,
    payment_date DATE
);