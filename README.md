# Airline Analytics with SQL and NoSQL

Group project for **BC2402 Designing & Developing Databases** at Nanyang Technological University (Seminar Group 4, Team 16).

We answered ten business questions about airline operations and customer experience twice: once in a relational database (MySQL) and once in a document database (MongoDB). Most of the analysis centres on Singapore Airlines.

**Video walkthrough:** https://youtu.be/4rap3exQiK0

## Datasets

| Table / collection | Contents |
|---|---|
| `customer_support` | Customer support chatbot interactions: category, flags, responses |
| `flight_delay` | US flight records with cancellations and delay causes |
| `sia_stock` | Singapore Airlines daily share prices |
| `customer_booking` | Booking records: sales channel, route, length of stay, add-ons |
| `airlines_reviews` | Passenger reviews and ratings for Singapore Airlines and Qatar Airways |

## Questions covered

| # | Question | Techniques |
|---|---|---|
| 1 | How many valid support categories are there once noisy values are cleaned out? | Frequency filtering |
| 2 | How many records per category carry both the `Q` and `W` flags? | Pattern matching, `$lookup`, regex |
| 3 | How many cancellations and delays does each airline have? | `UNION ALL`, `$merge` |
| 4 | Which route has the most delays in each month? | CTEs, `$group` / `$unwind` |
| 5 | How did SIA's share price move quarter on quarter in 2023? | Window functions (`LAG`, `$setWindowFields`) |
| 6 | How do length of stay and add-on requests vary with flight hours by sales channel and route? | Ratios, Pearson correlation in SQL |
| 7 | Do ratings differ between peak (Jun–Sep) and off-peak periods by airline and class? | Conditional grouping |
| 8 | What drives negative reviews, by airline and traveller type? | Keyword frequency, stop-word filtering |
| 9 | How did SIA's ratings and complaint themes change before and after COVID-19? | Date parsing, period comparison |
| 10 | How could a chatbot handle exceptional events such as the SQ321 turbulence incident? | Text analysis of reviews and chatbot responses |

## Files

- `mysql_queries.sql`: MySQL queries for Q1–Q10
- `mongodb_queries.js`: MongoDB aggregation pipelines for Q1–Q10

## Team

| Member | Questions |
|---|---|
| Natasha | Q1, Q2, Q8 |
| Darren | Q3, Q4, Q9 |
| Faith | Q5, Q10 |
| Wen Yue | Q6, Q7 |

## Tech

MySQL · MongoDB
