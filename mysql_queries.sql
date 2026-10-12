/* Q1 */

-- Count the number of unique categories in the customer_support table, uncleaned 
SELECT COUNT(DISTINCT category) AS number_of_categories
FROM customer_support;

-- showing the relevant categories, cleaning those with frequency less than 25
SELECT category, COUNT(*) AS category_count
FROM customer_support
GROUP BY category
HAVING COUNT(*) > 25;


/* Q2 */
-- temp table  for cleaned categories
CREATE TEMPORARY TABLE cleaned_categories AS
SELECT category
FROM customer_support
GROUP BY category
HAVING COUNT(*) > 25;

-- q and w flag count
SELECT 
    cs.category,
    SUM(CASE WHEN cs.flags LIKE '%Q%' AND cs.flags LIKE '%W%' THEN 1 ELSE 0 END) AS WandQ_count
FROM 
    customer_support cs
GROUP BY 
    cs.category
HAVING 
    COUNT(*) > 25;
    

/* Q3 */
SELECT 
    Airline, 
    SUM(Cancellations) AS Cancellations,
    SUM(Delays) AS Delays
FROM (
    SELECT 
        Airline, 
        COUNT(*) AS Cancellations,
        0 AS Delays
    FROM 
        flight_delay
    WHERE 
        Cancelled = 1
    GROUP BY 
        Airline
    UNION ALL
    SELECT 
        Airline, 
        0 AS Cancellations,
        COUNT(*) AS Delays
    FROM 
        flight_delay
	WHERE
		CarrierDelay > 0 
		OR WeatherDelay > 0 
		OR NASDelay > 0 
		OR SecurityDelay > 0 
		OR LateAircraftDelay > 0
    GROUP BY 
        Airline
) AS combined
GROUP BY 
    Airline;


/* Q4 */

WITH DelayedFlights AS (
    SELECT
        MONTH(STR_TO_DATE(Date, '%d-%m-%Y')) AS Month,
        CONCAT(Origin, '-', Dest) AS Route,
        CASE 
            WHEN CarrierDelay > 0 OR WeatherDelay > 0 OR NASDelay > 0 OR SecurityDelay > 0 OR LateAircraftDelay > 0
            THEN 1
            ELSE 0
        END AS IsDelayed
    FROM 
        flight_delay
)


, RouteDelayCounts AS (
    SELECT
        Month,
        Route,
        COUNT(*) AS DelayCount
    FROM
        DelayedFlights
    WHERE
        IsDelayed = 1
    GROUP BY
        Month, Route
)


SELECT
    rdc.Month,
    rdc.Route,
    rdc.DelayCount
FROM
    RouteDelayCounts rdc
JOIN (
    SELECT
        Month,
        MAX(DelayCount) AS MaxDelayCount
    FROM
        RouteDelayCounts
    GROUP BY
        Month
) AS MonthlyMax ON rdc.Month = MonthlyMax.Month AND rdc.DelayCount = MonthlyMax.MaxDelayCount
ORDER BY
    rdc.Month;
    
    
/* 5 */
WITH QuarterlyStats AS ( 
    SELECT 
        QUARTER(STR_TO_DATE(StockDate, '%m/%d/%Y')) AS Quarter,  #splitting the data into its respective quarters
        MIN(Low) AS QuarterLow, #determining the lowest price for each quarter
        MAX(High) AS QuarterHigh, #determining the highest price for each quarter
        ROUND(AVG(Price),2) AS QuarterAvgPrice #determining the average price for each quarter
    FROM sia_stock
    WHERE YEAR(STR_TO_DATE(StockDate, '%m/%d/%Y')) = 2023 #filtering such that only 2023 data will be used
    GROUP BY QUARTER(STR_TO_DATE(StockDate, '%m/%d/%Y'))
),
QuarterlyChanges AS ( #determining the quarterly change in numbers and %
    SELECT 
        Quarter, 
        QuarterLow, 
        QuarterHigh, 
        QuarterAvgPrice,
        ROUND(QuarterLow - LAG(QuarterLow) OVER (ORDER BY Quarter), 2) AS LowPriceChange,
        ROUND(QuarterHigh - LAG(QuarterHigh) OVER (ORDER BY Quarter), 2) AS HighPriceChange,
        ROUND((QuarterLow - LAG(QuarterLow) OVER (ORDER BY Quarter)) / LAG(QuarterLow) OVER (ORDER BY Quarter) * 100, 2) AS MinPriceQoQGrowth,
        ROUND((QuarterHigh - LAG(QuarterHigh) OVER (ORDER BY Quarter)) / LAG(QuarterHigh) OVER (ORDER BY Quarter) * 100, 2) AS MaxPriceQoQGrowth
    FROM QuarterlyStats
)
SELECT 
    Quarter, 
    QuarterLow, 
    LowPriceChange,
    CONCAT(MinPriceQoQGrowth, "%") AS LowPriceQoQGrowth,
    QuarterHigh, 
    HighPriceChange,
    CONCAT(MaxPriceQoQGrowth, "%") AS HighPriceQoQGrowth,
    QuarterAvgPrice
FROM QuarterlyChanges
WHERE Quarter >= 1
ORDER BY Quarter;


/* Q6 */
-- sales channel and route --
SELECT sales_channel, route,
    COUNT(*) AS sum_flights,
    ROUND(AVG(length_of_stay) / AVG(flight_hour), 2) AS avg_length_of_stay_per_flight_hour,
    ROUND(AVG(wants_extra_baggage) / AVG(flight_hour), 2) AS avg_extra_baggage_per_flight_hour,
    ROUND(AVG(wants_preferred_seat) / AVG(flight_hour), 2) AS avg_preferred_seat_per_flight_hour,
    ROUND(AVG(wants_in_flight_meals) / AVG(flight_hour), 2) AS avg_in_flight_meals_per_flight_hour
FROM 
    customer_booking
GROUP BY 
    sales_channel, route
ORDER BY 
    sales_channel, sum_flights DESC, route;

-- correlation --
SELECT 'length_of_stay vs flight_hour' AS correlation_name,
    ROUND((AVG(length_of_stay * flight_hour) - AVG(length_of_stay) * AVG(flight_hour)) /
    (SQRT(AVG(length_of_stay * length_of_stay) - AVG(length_of_stay) * AVG(length_of_stay)) *
     SQRT(AVG(flight_hour * flight_hour) - AVG(flight_hour) * AVG(flight_hour))), 2) AS correlation_value
FROM customer_booking

UNION ALL

SELECT 'wants_extra_baggage vs flight_hour' AS correlation_name,
    ROUND((AVG(wants_extra_baggage * flight_hour) - AVG(wants_extra_baggage) * AVG(flight_hour)) /
    (SQRT(AVG(wants_extra_baggage * wants_extra_baggage) - AVG(wants_extra_baggage) * AVG(wants_extra_baggage)) *
     SQRT(AVG(flight_hour * flight_hour) - AVG(flight_hour) * AVG(flight_hour))), 2) AS correlation_value
FROM customer_booking

UNION ALL

SELECT 'wants_preferred_seat vs flight_hour' AS correlation_name,
    ROUND((AVG(wants_preferred_seat * flight_hour) - AVG(wants_preferred_seat) * AVG(flight_hour)) /
    (SQRT(AVG(wants_preferred_seat * wants_preferred_seat) - AVG(wants_preferred_seat) * AVG(wants_preferred_seat)) *
     SQRT(AVG(flight_hour * flight_hour) - AVG(flight_hour) * AVG(flight_hour))), 2) AS correlation_value
FROM customer_booking

UNION ALL

SELECT 'wants_in_flight_meals vs flight_hour' AS correlation_name,
    ROUND((AVG(wants_in_flight_meals * flight_hour) - AVG(wants_in_flight_meals) * AVG(flight_hour)) /
    (SQRT(AVG(wants_in_flight_meals * wants_in_flight_meals) - AVG(wants_in_flight_meals) * AVG(wants_in_flight_meals)) *
     SQRT(AVG(flight_hour * flight_hour) - AVG(flight_hour) * AVG(flight_hour))), 2) AS correlation_value
FROM customer_booking

UNION ALL

SELECT 'length_of_stay vs in_flight_meals' AS correlation_name,
    ROUND((AVG(length_of_stay * wants_in_flight_meals) - AVG(length_of_stay) * AVG(wants_in_flight_meals)) /
	(SQRT(AVG(length_of_stay * length_of_stay) - AVG(length_of_stay) * AVG(length_of_stay)) *
	SQRT(AVG(wants_in_flight_meals * wants_in_flight_meals) - AVG(wants_in_flight_meals) * AVG(wants_in_flight_meals))), 2) AS correlation_value
FROM customer_booking

UNION ALL

SELECT 'length_of_stay vs wants_preferred_seat' AS correlation_name,
    ROUND((AVG(length_of_stay * wants_preferred_seat) - AVG(length_of_stay) * AVG(wants_preferred_seat)) /
    (SQRT(AVG(length_of_stay * length_of_stay) - AVG(length_of_stay) * AVG(length_of_stay)) *
     SQRT(AVG(wants_preferred_seat * wants_preferred_seat) - AVG(wants_preferred_seat) * AVG(wants_preferred_seat))), 2) AS correlation_value
FROM customer_booking

UNION ALL

SELECT 'length_of_stay vs wants_extra_baggage' AS correlation_name,
    ROUND((AVG(length_of_stay * wants_extra_baggage) - AVG(length_of_stay) * AVG(wants_extra_baggage)) /
    (SQRT(AVG(length_of_stay * length_of_stay) - AVG(length_of_stay) * AVG(length_of_stay)) *
     SQRT(AVG(wants_extra_baggage * wants_extra_baggage) - AVG(wants_extra_baggage) * AVG(wants_extra_baggage))), 2) AS correlation_value
FROM customer_booking

UNION ALL

SELECT 'wants_preferred_seat vs in_flight_meals' AS correlation_name,
    ROUND((AVG(wants_preferred_seat * wants_in_flight_meals) - AVG(wants_preferred_seat) * AVG(wants_in_flight_meals)) /
    (SQRT(AVG(wants_preferred_seat * wants_preferred_seat) - AVG(wants_preferred_seat) * AVG(wants_preferred_seat)) *
     SQRT(AVG(wants_in_flight_meals * wants_in_flight_meals) - AVG(wants_in_flight_meals) * AVG(wants_in_flight_meals))), 2) AS correlation_value
FROM customer_booking

UNION ALL

SELECT 'wants_preferred_seat vs wants_extra_baggage' AS correlation_name,
    ROUND((AVG(wants_preferred_seat * wants_extra_baggage) - AVG(wants_preferred_seat) * AVG(wants_extra_baggage)) /
    (SQRT(AVG(wants_preferred_seat * wants_preferred_seat) - AVG(wants_preferred_seat) * AVG(wants_preferred_seat)) *
     SQRT(AVG(wants_extra_baggage * wants_extra_baggage) - AVG(wants_extra_baggage) * AVG(wants_extra_baggage))), 2) AS correlation_value
FROM customer_booking

UNION ALL

SELECT 'wants_extra_baggage vs in_flight_meals' AS correlation_name,
    ROUND((AVG(wants_extra_baggage * wants_in_flight_meals) - AVG(wants_extra_baggage) * AVG(wants_in_flight_meals)) /
    (SQRT(AVG(wants_extra_baggage * wants_extra_baggage) - AVG(wants_extra_baggage) * AVG(wants_extra_baggage)) *
     SQRT(AVG(wants_in_flight_meals * wants_in_flight_meals) - AVG(wants_in_flight_meals) * AVG(wants_in_flight_meals))), 2) AS correlation_value
FROM customer_booking;


/* Q7 */
SELECT Airline, Class,
    CASE 
        WHEN SUBSTRING(MonthFlown, 1, 3) IN ('Jun', 'Jul', 'Aug', 'Sep') THEN 'Seasonal'
        ELSE 'Non-Seasonal'
    END AS Period, 
    ROUND(AVG(SeatComfort), 2) AS AvgSeatComfort, 
    ROUND(AVG(FoodnBeverages), 2) AS AvgFoodnBeverages, 
    ROUND(AVG(InflightEntertainment), 2) AS AvgInflightEntertainment, 
    ROUND(AVG(ValueForMoney), 2) AS AvgValueForMoney,
    ROUND(AVG(OverallRating), 2) AS AvgOverallRating 
FROM 
    airlines_reviews
GROUP BY 
    Airline, Class, Period 
ORDER BY 
    Airline, FIELD(Class, 'First Class', 'Business Class', 'Premium Economy', 'Economy Class'), Period; 


/* Q8 */
-- 1311 true, 268 false
-- checking number of verified
SELECT 
    Verified, 
    COUNT(*) AS frequency
FROM 
    airlines_reviews
GROUP BY 
    Verified
ORDER BY 
    frequency DESC;
    

-- display true reviews in new table 
CREATE TABLE true_reviews AS
SELECT *
FROM airlines_reviews
WHERE Verified = 'TRUE';

-- check no of rows
SELECT COUNT(*) AS total_rows
FROM true_reviews;
-- has 1311 rows

-- types of airlines
SELECT 
    Airline, 
    COUNT(*) AS frequency
FROM 
    true_reviews
GROUP BY 
    Airline
ORDER BY 
    frequency DESC;
    
-- types of traveller
SELECT 
    TypeofTraveller, 
    COUNT(*) AS frequency
FROM 
    true_reviews
GROUP BY 
    TypeofTraveller
ORDER BY 
    frequency DESC;

-- define poor ratings as <5 for overallrating
SELECT 
    COUNT(*) AS badRatingReviews_count
FROM 
    true_reviews
WHERE 
    OverallRating < 5;

-- by words count
-- airline number of keywords in review
SELECT 
    'service' AS Word,
    SUM(CASE WHEN Airline = 'Singapore Airlines' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'service', '')) ELSE 0 END) AS Singapore_Airlines,
    SUM(CASE WHEN Airline = 'Qatar Airways' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'service', '')) ELSE 0 END) AS Qatar_Airways
FROM true_reviews
WHERE OverallRating < 5

UNION ALL

SELECT 
    'customer',
    SUM(CASE WHEN Airline = 'Singapore Airlines' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'customer', '')) ELSE 0 END),
    SUM(CASE WHEN Airline = 'Qatar Airways' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'customer', '')) ELSE 0 END)
FROM true_reviews
WHERE OverallRating < 5

UNION ALL

SELECT 
    'staff',
    SUM(CASE WHEN Airline = 'Singapore Airlines' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'staff', '')) ELSE 0 END),
    SUM(CASE WHEN Airline = 'Qatar Airways' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'staff', '')) ELSE 0 END)
FROM true_reviews
WHERE OverallRating < 5

UNION ALL

SELECT 
    'seating',
    SUM(CASE WHEN Airline = 'Singapore Airlines' THEN 
        LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'seat', '')) +
        LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'seats', '')) +
        LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'seating', ''))
        ELSE 0 END),
    SUM(CASE WHEN Airline = 'Qatar Airways' THEN 
        LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'seat', '')) +
        LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'seats', '')) +
        LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'seating', ''))
        ELSE 0 END)
FROM true_reviews
WHERE OverallRating < 5

UNION ALL

SELECT 
    'hours',
    SUM(CASE WHEN Airline = 'Singapore Airlines' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'hours', '')) ELSE 0 END),
    SUM(CASE WHEN Airline = 'Qatar Airways' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'hours', '')) ELSE 0 END)
FROM true_reviews
WHERE OverallRating < 5

UNION ALL

SELECT 
    'refund',
    SUM(CASE WHEN Airline = 'Singapore Airlines' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'refund', '')) ELSE 0 END),
    SUM(CASE WHEN Airline = 'Qatar Airways' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'refund', '')) ELSE 0 END)
FROM true_reviews
WHERE OverallRating < 5

UNION ALL

SELECT 
    'compensation',
    SUM(CASE WHEN Airline = 'Singapore Airlines' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'compensation', '')) ELSE 0 END),
    SUM(CASE WHEN Airline = 'Qatar Airways' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'compensation', '')) ELSE 0 END)
FROM true_reviews
WHERE OverallRating < 5

UNION ALL

SELECT 
    'disappointed',
    SUM(CASE WHEN Airline = 'Singapore Airlines' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'disappointed', '')) ELSE 0 END),
    SUM(CASE WHEN Airline = 'Qatar Airways' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'disappointed', '')) ELSE 0 END)
FROM true_reviews
WHERE OverallRating < 5

UNION ALL

SELECT 
    'baggage',
    SUM(CASE WHEN Airline = 'Singapore Airlines' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'baggage', '')) ELSE 0 END),
    SUM(CASE WHEN Airline = 'Qatar Airways' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'baggage', '')) ELSE 0 END)
FROM true_reviews
WHERE OverallRating < 5

UNION ALL

SELECT 
    'luggage',
    SUM(CASE WHEN Airline = 'Singapore Airlines' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'luggage', '')) ELSE 0 END),
    SUM(CASE WHEN Airline = 'Qatar Airways' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'luggage', '')) ELSE 0 END)
FROM true_reviews
WHERE OverallRating < 5

UNION ALL

SELECT 
    'quality',
    SUM(CASE WHEN Airline = 'Singapore Airlines' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'quality', '')) ELSE 0 END),
    SUM(CASE WHEN Airline = 'Qatar Airways' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'quality', '')) ELSE 0 END)
FROM true_reviews
WHERE OverallRating < 5

UNION ALL

SELECT 
    'uncomfortable',
    SUM(CASE WHEN Airline = 'Singapore Airlines' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'uncomfortable', '')) ELSE 0 END),
    SUM(CASE WHEN Airline = 'Qatar Airways' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'uncomfortable', '')) ELSE 0 END)
FROM true_reviews
WHERE OverallRating < 5;

-- traveller number of keywords in review
SELECT 
    'service' AS Word,
    SUM(CASE WHEN TypeofTraveller = 'Solo Leisure' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'service', '')) ELSE 0 END) AS Solo_Leisure,
    SUM(CASE WHEN TypeofTraveller = 'Business' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'service', '')) ELSE 0 END) AS Business,
    SUM(CASE WHEN TypeofTraveller = 'Couple Leisure' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'service', '')) ELSE 0 END) AS Couple_Leisure,
    SUM(CASE WHEN TypeofTraveller = 'Family Leisure' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'service', '')) ELSE 0 END) AS Family_Leisure
FROM true_reviews
WHERE OverallRating < 5

UNION ALL

SELECT 
    'customer',
    SUM(CASE WHEN TypeofTraveller = 'Solo Leisure' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'customer', '')) ELSE 0 END),
    SUM(CASE WHEN TypeofTraveller = 'Business' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'customer', '')) ELSE 0 END),
    SUM(CASE WHEN TypeofTraveller = 'Couple Leisure' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'customer', '')) ELSE 0 END),
    SUM(CASE WHEN TypeofTraveller = 'Family Leisure' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'customer', '')) ELSE 0 END)
FROM true_reviews
WHERE OverallRating < 5

UNION ALL

SELECT 
    'staff',
    SUM(CASE WHEN TypeofTraveller = 'Solo Leisure' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'staff', '')) ELSE 0 END),
    SUM(CASE WHEN TypeofTraveller = 'Business' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'staff', '')) ELSE 0 END),
    SUM(CASE WHEN TypeofTraveller = 'Couple Leisure' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'staff', '')) ELSE 0 END),
    SUM(CASE WHEN TypeofTraveller = 'Family Leisure' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'staff', '')) ELSE 0 END)
FROM true_reviews
WHERE OverallRating < 5

UNION ALL

SELECT 
    'seating',
    SUM(CASE WHEN TypeofTraveller = 'Solo Leisure' THEN 
        LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'seat', '')) +
        LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'seats', '')) +
        LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'seating', ''))
        ELSE 0 END),
    SUM(CASE WHEN TypeofTraveller = 'Business' THEN 
        LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'seat', '')) +
        LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'seats', '')) +
        LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'seating', ''))
        ELSE 0 END),
    SUM(CASE WHEN TypeofTraveller = 'Couple Leisure' THEN 
        LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'seat', '')) +
        LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'seats', '')) +
        LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'seating', ''))
        ELSE 0 END),
    SUM(CASE WHEN TypeofTraveller = 'Family Leisure' THEN 
        LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'seat', '')) +
        LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'seats', '')) +
        LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'seating', ''))
        ELSE 0 END)
FROM true_reviews
WHERE OverallRating < 5

UNION ALL

SELECT 
    'refund',
    SUM(CASE WHEN TypeofTraveller = 'Solo Leisure' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'refund', '')) ELSE 0 END),
    SUM(CASE WHEN TypeofTraveller = 'Business' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'refund', '')) ELSE 0 END),
    SUM(CASE WHEN TypeofTraveller = 'Couple Leisure' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'refund', '')) ELSE 0 END),
    SUM(CASE WHEN TypeofTraveller = 'Family Leisure' THEN LENGTH(LOWER(Reviews)) - LENGTH(REPLACE(LOWER(Reviews), 'refund', '')) ELSE 0 END)
FROM true_reviews
WHERE OverallRating < 5;


/* Q9 */    
SELECT
	AVG(SeatComfort) AS avg_seatcomfort,
    AVG(StaffService) AS avg_staffservice,
    AVG(FoodnBeverages) AS avg_foodnbeverages,
    AVG(InflightEntertainment) AS avg_inflightentertainment,
    AVG(ValueForMoney) AS avg_valueformoney,
    AVG(OverallRating) AS avg_overallrating,
    Class,
    'Pre-COVID' AS Period
FROM airlines_reviews
WHERE airline = 'Singapore Airlines' AND STR_TO_DATE(ReviewDate, '%d/%m/%Y') < '2020-03-01' AND Verified = 'True'
GROUP BY Class

UNION ALL

SELECT
	AVG(SeatComfort) AS avg_seatcomfort,
    AVG(StaffService) AS avg_staffservice,
    AVG(FoodnBeverages) AS avg_foodnbeverages,
    AVG(InflightEntertainment) AS avg_inflightentertainment,
    AVG(ValueForMoney) AS avg_valueformoney,
    AVG(OverallRating) AS avg_overallrating,
    Class,
    'Post-COVID' AS Period
FROM airlines_reviews
WHERE airline = 'Singapore Airlines' AND STR_TO_DATE(ReviewDate, '%d/%m/%Y') > '2020-03-01' AND Verified = 'True'
GROUP BY Class;


SELECT 
    keyword, 
    SUM(CASE WHEN STR_TO_DATE(ReviewDate, '%d/%m/%Y') < '2020-03-01' THEN 1 ELSE 0 END) AS pre_covid,
    SUM(CASE WHEN STR_TO_DATE(ReviewDate, '%d/%m/%Y') >= '2020-03-01' THEN 1 ELSE 0 END) AS post_covid
    FROM 
    (
    SELECT 'service' AS keyword, ReviewDate    
    FROM airlines_reviews
    WHERE OverallRating < 5 AND LOWER(reviews) LIKE '%service%'    
    
    UNION ALL
    
    SELECT 'delay', ReviewDate   
    FROM airlines_reviews
    WHERE OverallRating < 5 AND LOWER(reviews) LIKE '%delay%'    
    
    UNION ALL
    
    SELECT 'cleanliness', ReviewDate   
    FROM airlines_reviews
    WHERE OverallRating < 5 AND LOWER(reviews) LIKE '%cleanliness%'
    
    UNION ALL
    
    SELECT 'uncomfortable', ReviewDate   
    FROM airlines_reviews
    WHERE OverallRating < 5 AND LOWER(reviews) LIKE '%uncomfortable%'
    
    UNION ALL
    
    SELECT 'meal', ReviewDate   
    FROM airlines_reviews
    WHERE OverallRating < 5 AND LOWER(reviews) LIKE '%meal%'
    
    UNION ALL
    
    SELECT 'entertainment', ReviewDate   
    FROM airlines_reviews
    WHERE OverallRating < 5 AND LOWER(reviews) LIKE '%entertainment%'
    
    UNION ALL
    
    SELECT 'refund', ReviewDate   
    FROM airlines_reviews
    WHERE OverallRating < 5 AND LOWER(reviews) LIKE '%refund%')
    
AS negative_reviews
GROUP BY keyword;

SELECT 
	COUNT(*) AS NumberOfReviewsPreCOVID
    FROM airlines_reviews
    WHERE STR_TO_DATE(ReviewDate, '%d/%m/%Y') < '2020-03-01';
    
SELECT 
	COUNT(*) AS NumberOfReviewsPostCOVID
    FROM airlines_reviews
    WHERE STR_TO_DATE(ReviewDate, '%d/%m/%Y') >= '2020-03-01'; 


/* Q10 */ 
SELECT * FROM airlines_reviews #filtering feedback based off a keywords, rating < 5 (unsatisfactory) and verfied status
WHERE Reviews LIKE "%turbulence%" AND OverallRating < 5 AND Verified = "TRUE";

SELECT * FROM airlines_reviews
WHERE Reviews LIKE "%compensate%" AND OverallRating < 5 AND Verified = "TRUE";

SELECT * FROM airlines_reviews
WHERE Reviews LIKE "%safe%" AND OverallRating < 5 AND Verified = "TRUE";