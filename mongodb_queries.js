// NoSQL script for Group 16

// Question 1

// count the unique categories in the collection before cleaaning
db.customer_support.distinct("category").length;


db.customer_support.aggregate([
    {
        $group: {
            _id: "$category",
            frequency: { $sum: 1}
            
        }
    }, 
    {
        $sort: { frequency : -1 } 
    }]);
    
    
// final answer after cleaning data with errors (data with values less than 25 frequency)
db.customer_support.aggregate([
    {
        $group: {
            _id: "$category", // grp by cat 
            frequency: { $sum: 1 } 
        }
    },
    {
        $match: { frequency: { $gte: 25 } } // Filter categories with frequency >= 25
    },
    {
        $sort: { frequency: -1 } // descending order
    }
]);






// Question 2
db.customer_support.aggregate([
    // group by category
    {
        $group: {
            _id: "$category",
            category_count: { $sum: 1 } // count in each cat 
        }
    },
    // only more than 25 frequency 
    {
        $match: {
            category_count: { $gt: 25 }
        }
    },
    {
        $lookup: {
            from: "customer_support",
            localField: "_id",
            foreignField: "category",
            as: "matching_records"
        }
    },
    // flatten 
    {
        $unwind: "$matching_records"
    },
    // contain W and Q 
    {
        $match: {
            "matching_records.flags": {
                $regex: "(?=.*W)(?=.*Q)", // both present 
                $options: "i" // case-insensitive
            }
        }
    },
    // group by category
    {
        $group: {
            _id: "$_id", 
            flags_with_w_and_q: { $sum: 1 } 
        }
    },
    // sort 
    {
        $sort: { flags_with_w_and_q: -1 }
    }
]);

// Question 3


db.flight_delay.aggregate([
  {
    // counting all types of delays
    $match: {
      $or: [
        { CarrierDelay: { $gt: 0 } },
        { WeatherDelay: { $gt: 0 } },
        { NASDelay: { $gt: 0 } },
        { SecurityDelay: { $gt: 0 } },
        { LateAircraftDelay: { $gt: 0 } }
      ]
    }
  },
  {
    $group: {
      _id: "$Airline",
      Delays: { $sum: 1 }
    }
  },
  {
    $merge: {
      into: "flight_summary",
      whenMatched: "merge",
      whenNotMatched: "insert"
    }
  }
]);

  db.flight_delay.aggregate([
  {
    $group: {
      _id: "$Airline",
      Cancellations: {
        $sum: {
          $cond: [{ $ne: ["$Cancelled", 0] }, 1, 0] 
        }
      }
    }
  },
  {
    $merge: {
      into: "flight_summary",
      whenMatched: "merge",
      whenNotMatched: "insert"
    }
  }
]);

db.flight_summary.find({})

// Question 4

db.flight_delay.aggregate([
  {
    $addFields: {
      Month: { $month: { $dateFromString: { dateString: "$Date", format: "%d-%m-%Y" } } },
      Route: { $concat: ["$Origin", "-", "$Dest"] }
    }
  },
  {
    $match: {
      $or: [
        { CarrierDelay: { $gt: 0 } },
        { WeatherDelay: { $gt: 0 } },
        { NASDelay: { $gt: 0 } },
        { SecurityDelay: { $gt: 0 } },
        { LateAircraftDelay: { $gt: 0 } }
      ]
    }
  },
  {
    $group: {
      _id: { Month: "$Month", Route: "$Route" },
      DelayCount: { $sum: 1 }
    }
  },
  {
    $group: {
      _id: "$_id.Month",
      MaxDelayCount: { $max: "$DelayCount" },
      Routes: { $push: { Route: "$_id.Route", DelayCount: "$DelayCount" } }
    }
  },
  {
    $unwind: "$Routes"
  },
  {
    $match: {
      $expr: { $eq: ["$Routes.DelayCount", "$MaxDelayCount"] }
    }
  },
  {
    $project: {
      Month: "$_id",
      Route: "$Routes.Route",
      DelayCount: "$Routes.DelayCount",
      _id: 0
    }
  },
  {
    $sort: { Month: 1 }
  }
]);

// Question 5

db.sia_stock.aggregate([  
    {
        $addFields: {  //split date
            ParsedDate: { 
                $dateFromString: { 
                    dateString: "$StockDate", 
                    format: "%m/%d/%Y" 
                } 
            }
        }
    },
    {
        $match: { //filter to only 2023 data
            $expr: {
                $eq: [{ $year: "$ParsedDate" }, 2023]
            }
        }
    },
    {
        $group: { //finding min,max,average price
            _id: { 
                $ceil: [{ $divide: [{ $month: "$ParsedDate" }, 3] }]
            },
            QuarterMin: { $min: "$Low" },
            QuarterMax: { $max: "$High" },
            QuarterAvgPrice: { $avg: "$Price" }
        }
    },
    {
        $sort: { "_id": 1 }
    },
    {
        $setWindowFields: {
            partitionBy: null,
            sortBy: { _id: 1 },
            output: {
                PrevQuarterMin: {
                    $shift: {
                        output: "$QuarterMin",
                        by: -1
                    }
                },
                PrevQuarterMax: {
                    $shift: {
                        output: "$QuarterMax",
                        by: -1
                    }
                },
                PrevQuarterAvgPrice: {
                    $shift: {
                        output: "$QuarterAvgPrice",
                        by: -1
                    }
                }
            }
        }
    },
    {
        $addFields: {
            QoQMinChange: { //finding min qoq change in %
                $cond: {
                    if: { $ne: ["$PrevQuarterMin", null] },
                    then: { $multiply: [{ $divide: [{ $subtract: ["$QuarterMin", "$PrevQuarterMin"] }, "$PrevQuarterMin"] }, 100] },
                    else: null
                }
            },
            QoQMaxChange: { //finding max qoq change in %
                $cond: {
                    if: { $ne: ["$PrevQuarterMax", null] },
                    then: { $multiply: [{ $divide: [{ $subtract: ["$QuarterMax", "$PrevQuarterMax"] }, "$PrevQuarterMax"] }, 100] },
                    else: null
                }
            }
        }
    },
    {
        $project: { //display data
            Quarter: "$_id",
            QuarterMin: 1,
            QuarterMax: 1,
            QuarterAvgPrice: { $round: ["$QuarterAvgPrice", 2] },
            QoQMinChange: {
                $cond: {
                    if: { $ne: ["$QoQMinChange", null] },
                    then: {
                        $concat: [ //adding % sign
                            { $toString: { $round: ["$QoQMinChange", 2] } },
                            "%"
                        ]
                    },
                    else: null
                }
            },
            QoQMaxChange: {
                $cond: {
                    if: { $ne: ["$QoQMaxChange", null] },
                    then: {
                        $concat: [ // adding % sign
                            { $toString: { $round: ["$QoQMaxChange", 2] } },
                            "%"
                        ]
                    },
                    else: null
                }
            }
        }
    }
]);


// Question 6 

db.customer_booking.aggregate([
    {
        $match: {
            flight_duration: { $gt: 0 }
        }
    },
    {
        $group: {
            _id: {
                route: "$route",
                sales_channel: "$sales_channel",
                flight_hour: "$flight_duration"
            },
            avgLengthOfStay: { $avg: "$length_of_stay" },
            avgExtraBaggage: { $avg: "$wants_extra_baggage" },
            avgPreferredSeat: { $avg: "$wants_preferred_seat" },
            avgInFlightMeals: { $avg: "$wants_in_flight_meals" },
            count: { $sum: 1 } 
        }
    },
    {
        $project: {
            _id: 0,
            route: "$_id.route",
            sales_channel: "$_id.sales_channel",
            flight_hour: "$_id.flight_hour",
            NumberOfFlights: "$count", // Include number of flights
            AverageLengthOfStayPerFlightHour: {
                $round: [{ $divide: ["$avgLengthOfStay", "$_id.flight_hour"] }, 2]
            },
            AverageBaggageRequestPerFlightHour: {
                $round: [{ $divide: ["$avgExtraBaggage", "$_id.flight_hour"] }, 2]
            },
            AveragePreferredSeatRequestPerFlightHour: {
                $round: [{ $divide: ["$avgPreferredSeat", "$_id.flight_hour"] }, 2]
            },
            AverageInFlightMealRequestPerFlightHour: {
                $round: [{ $divide: ["$avgInFlightMeals", "$_id.flight_hour"] }, 2]
            }
        }
    },
    {
        $sort: {
            route: 1,
            sales_channel: 1,
            flight_hour: 1
        }
    }
]);


// Question 7 

db.airlines_reviews.aggregate([
  {
    $addFields: {
      seasonality: {
        $cond: [
          { $in: ["$MonthFlown", ["Jun-23", "Jul-23", "Aug-23", "Sep-23", "Jun-24", "Jul-24", "Aug-24", "Sep-24"]] },
          "Seasonal",
          "Non-Seasonal"
        ]
      }
    }
  },
  {
    $group: {
      _id: {
        airline: "$Airline",
        class: "$Class",
        seasonality: "$seasonality"
      },
      avg_seat_comfort: { $avg: "$SeatComfort" },
      avg_food_beverages: { $avg: "$FoodnBeverages" },
      avg_inflight_entertainment: { $avg: "$InflightEntertainment" },
      avg_value_for_money: { $avg: "$ValueForMoney" },
      avg_overall_rating: { $avg: "$OverallRating" }
    }
  },
  {
    $project: {
      _id: 0,
      airline: "$_id.airline",
      class: "$_id.class",
      seasonality: "$_id.seasonality",
      avg_seat_comfort: { $round: ["$avg_seat_comfort", 3] },
      avg_food_beverages: { $round: ["$avg_food_beverages", 3] },
      avg_inflight_entertainment: { $round: ["$avg_inflight_entertainment", 3] },
      avg_value_for_money: { $round: ["$avg_value_for_money", 3] },
      avg_overall_rating: { $round: ["$avg_overall_rating", 3] }
    }
  },
  {
    $sort: {
      airline: 1,
      class: 1,
      seasonality: 1
    }
  }
]);

// QUESTION 8 
// overall  rating  by airline 
db.airlines_reviews.aggregate([
    { $match: { Verified: { $ne: "FALSE" } } },
    { $group: { _id: "$Airline", avgRating: { $avg: "$OverallRating" }, totalReviews: { $sum: 1 } } },
    { $sort: { avgRating: -1 } }
]);


// overall rating by type of traveller
db.airlines_reviews.aggregate([
    { $match: { Verified: { $ne: "FALSE" } } },
    {
        $group: {
            _id: "$TypeofTraveller",
            avgRating: { $avg: "$OverallRating" },
            topAirline: { $first: "$Airline" }
        }
    },
    { $sort: { avgRating: -1 } }
]);



// individual category rating by air line 
db.airlines_reviews.aggregate([
    {
        $group: {
            _id: "$Airline", // Group by Airline
            avgOverallRating: { $avg: "$OverallRating" }, // Average Overall Rating
            avgSeatComfort: { $avg: "$SeatComfort" }, // Average Seat Comfort Rating
            avgStaffService: { $avg: "$StaffService" }, // Average Staff Service Rating
            avgFoodBeverage: { $avg: "$FoodnBeverages" }, // Average Food & Beverage Rating
            avgInflightEntertainment: { $avg: "$InflightEntertainment" }, // Average Inflight Entertainment Rating
            avgValueForMoney: { $avg: "$ValueForMoney" } // Average Value for Money Rating
        }
    },
    {
        $sort: { avgOverallRating: -1 } // Sort by Overall Rating in descending order
    }
]);

// individual rating by typeoftraveller 
db.airlines_reviews.aggregate([
    {
        $group: {
            _id: "$TypeofTraveller", // Group by Type of Traveller
            avgOverallRating: { $avg: "$OverallRating" }, // Average Overall Rating
            avgSeatComfort: { $avg: "$SeatComfort" }, // Average Seat Comfort Rating
            avgStaffService: { $avg: "$StaffService" }, // Average Staff Service Rating
            avgFoodBeverage: { $avg: "$FoodnBeverages" }, // Average Food & Beverage Rating
            avgInflightEntertainment: { $avg: "$InflightEntertainment" }, // Average Inflight Entertainment Rating
            avgValueForMoney: { $avg: "$ValueForMoney" } // Average Value for Money Rating
        }
    },
    {
        $sort: { avgOverallRating: -1 } // Sort by Overall Rating in descending order
    }
]);

// common words TITLE by airline
db.airlines_reviews.aggregate([
    {
        $match: { Verified: { $ne: "FALSE" }, OverallRating: { $lte: 4 } } // Filter negative and verified reviews
    },
    {
        $group: {
            _id: "$Airline", // Group by Airline
            allTitle: { $push: "$Title" } // Collect all titles for each airline
        }
    },
    {
        $project: {
            Airline: "$_id",
            combinedText: { 
                $reduce: { 
                    input: "$allTitle", 
                    initialValue: "", 
                    in: { $concat: ["$$value", " ", "$$this"] } 
                } 
            } // Combine all titles into a single string
        }
    },
    {
        $project: {
            Airline: 1,
            complaintKeywords: { $split: ["$combinedText", " "] } // Split the combined text into individual keywords
        }
    },
    { $unwind: "$complaintKeywords" }, // Flatten the keywords
    {
        $match: { 
            complaintKeywords: { $nin: ["the", "to", "and", "was", "a", "of", "in", "on", "for",
            "it", "with", "at", "", "this", "that", "my", "is", "were", "I"] } 
        } // Exclude stopwords
    },
    {
        $group: {
            _id: { Airline: "$Airline", Keyword: "$complaintKeywords" },
            count: { $sum: 1 } // Count keyword frequency
        }
    },
    { $sort: { count: -1 } }, // Sort by frequency
    {
        $group: {
            _id: "$_id.Airline",
            topKeywords: { $push: { keyword: "$_id.Keyword", count: "$count" } }
        }
    },
    {
        $project: {
            Airline: "$_id",
            topKeywords: { $slice: ["$topKeywords", 30] } // Limit to top 30 keywords
        }
    }
]);

// common word by traveller type TITLE 
db.airlines_reviews.aggregate([
    {
        $match: { Verified: { $ne: "FALSE" }, OverallRating: { $lte: 4 } } // Filter negative and verified reviews
    },
    {
        $group: {
            _id: "$TypeofTraveller", // Group by Type of Traveller
            allTitle: { $push: "$Title" } // Collect all titles for each traveler type
        }
    },
    {
        $project: {
            TypeofTraveller: "$_id",
            combinedText: { 
                $reduce: { 
                    input: "$allTitle", 
                    initialValue: "", 
                    in: { $concat: ["$$value", " ", "$$this"] } 
                } 
            } // Combine all titles into a single string
        }
    },
    {
        $project: {
            TypeofTraveller: 1,
            complaintKeywords: { $split: ["$combinedText", " "] } // Split the combined text into individual keywords
        }
    },
    { $unwind: "$complaintKeywords" }, // Flatten the keywords
    {
        $match: { 
            complaintKeywords: { $nin: ["the", "to", "and", "was", "a", "of", "in", "on", "for", "it", "with", 
            "at", "", "this", "that", "my", "us", "our", "they", "me", "were", "I", "my", "is"] } 
        } // Exclude stopwords
    },
    {
        $group: {
            _id: { TypeofTraveller: "$TypeofTraveller", Keyword: "$complaintKeywords" },
            count: { $sum: 1 } // Count keyword frequency
        }
    },
    { $sort: { count: -1 } }, // Sort by frequency
    {
        $group: {
            _id: "$_id.TypeofTraveller",
            topKeywords: { $push: { keyword: "$_id.Keyword", count: "$count" } }
        }
    },
    {
        $project: {
            TypeofTraveller: "$_id",
            topKeywords: { $slice: ["$topKeywords", 30] } // Limit to top 5 keywords
        }
    }
]);


// showing top 5 reviews for a guage/sensing on what the reviews look like 
db.airlines_reviews.aggregate([
    { 
        $match: { Verified: { $ne: "FALSE" }, OverallRating: { $lte: 4 } } // Filter negative, verified reviews
    },
    { 
        $project: { complaintText: "$Reviews" } // Focus on the Reviews field
    }
]);

db.airlines_reviews.aggregate([
    { 
        $match: { Verified: { $ne: "FALSE" }, OverallRating: { $lte: 4 } } // Negative reviews
    },
    { 
        $group: { 
            _id: "$Airline", 
            complaints: { $push: "$Reviews" } // Collect all reviews for each airline
        }
    },
    { 
        $project: { Airline: "$_id", complaints: { $slice: ["$complaints", 5] } } // Show top 5 reviews per airline
    }
]);



// find common complaint words n identifying the stopwords 

const stopwords = [
    "my", "not", "flight", "were", "we", "they", "had", "have", "from", "me", 
    "no", "but", "our", "an", "as", "the", "to", "and", "of", "in", "on", "for", 
    "is", "it", "with", "at", "", "this", "that", "I", "was", "a","The","We", "be", "are","their","by","or","would","you","which","did","us","They",
    "Them", "them", "been","there","has", "My"
];

// finding most appeared words in all reviews 
db.airlines_reviews.aggregate([
    { $match: { Verified: { $ne: "FALSE" }, OverallRating: { $lte: 4 } } }, // Focus on negative reviews
    { $project: { complaintKeywords: { $split: ["$Reviews", " "] } } }, // Split reviews into keywords
    { $unwind: "$complaintKeywords" }, // Flatten array
    { $match: { complaintKeywords: { $nin: stopwords } } }, // Exclude irrelevant words
    { $group: { _id: "$complaintKeywords", count: { $sum: 1 } } }, // Count occurrences
    { $sort: { count: -1 } }, // Sort by frequency
    { $limit: 100 } // Limit to top 50 meaningful words
]);

// split by common REVIEW words by airline n traveller
// sg airline 

const stopwords = [
    "my", "not", "flight", "were", "we", "they", "had", "have", "from", "me", 
    "no", "but", "our", "an", "as", "the", "to", "and", "of", "in", "on", "for", 
    "is", "it", "with", "at", "", "this", "that", "I", "was", "a","The","We", "be", "are","their","by","or","would","you","which","did","us","They",
    "Them", "them", "been","there","has", "My"
];

db.airlines_reviews.aggregate([
    { 
        $match: { 
            Verified: { $ne: "FALSE" }, 
            OverallRating: { $lte: 4 }, 
            Airline: "Singapore Airlines" 
        } 
    },
    { 
        $project: { 
            complaintKeywords: { $split: ["$Reviews", " "] } 
        } 
    },
    { $unwind: "$complaintKeywords" }, // Flatten array of words
    { 
        $match: { 
            complaintKeywords: { $nin: stopwords } // Exclude irrelevant words
        } 
    },
    { 
        $group: { 
            _id: "$complaintKeywords", 
            count: { $sum: 1 } 
        } 
    },
    { $sort: { count: -1 } }, // Sort by count in decreasing order
    { $limit: 50 } // Optional: Limit to top 50 words
]);

// qatar airway

const stopwords = [
    "my", "not", "flight", "were", "we", "they", "had", "have", "from", "me", 
    "no", "but", "our", "an", "as", "the", "to", "and", "of", "in", "on", "for", 
    "is", "it", "with", "at", "", "this", "that", "I", "was", "a","The","We", "be", "are","their","by","or","would","you","which","did","us","They",
    "Them", "them", "been","there","has", "My"
];

db.airlines_reviews.aggregate([
    { 
        $match: { 
            Verified: { $ne: "FALSE" }, 
            OverallRating: { $lte: 4 }, 
            Airline: "Qatar Airways" 
        } 
    },
    { 
        $project: { 
            complaintKeywords: { $split: ["$Reviews", " "] } 
        } 
    },
    { $unwind: "$complaintKeywords" }, // Flatten array of words
    { 
        $match: { 
            complaintKeywords: { $nin: stopwords } // Exclude irrelevant words
        } 
    },
    { 
        $group: { 
            _id: "$complaintKeywords", 
            count: { $sum: 1 } 
        } 
    },
    { $sort: { count: -1 } }, // Sort by count in decreasing order
    { $limit: 50 } // Optional: Limit to top 20 words
]);

// solo traveller

const stopwords = [
    "my", "not", "flight", "were", "we", "they", "had", "have", "from", "me", 
    "no", "but", "our", "an", "as", "the", "to", "and", "of", "in", "on", "for", 
    "is", "it", "with", "at", "", "this", "that", "I", "was", "a","The","We", "be", "are","their","by","or","would","you","which","did","us","They",
    "Them", "them", "been","there","has", "My"
];

db.airlines_reviews.aggregate([
    { 
        $match: { 
            Verified: { $ne: "FALSE" }, 
            OverallRating: { $lte: 4 }, 
            TypeofTraveller: "Solo Leisure" 
        } 
    },
    { 
        $project: { 
            complaintKeywords: { $split: ["$Reviews", " "] } 
        } 
    },
    { $unwind: "$complaintKeywords" }, // Flatten array of words
    { 
        $match: { 
            complaintKeywords: { $nin: stopwords } // Exclude irrelevant words
        } 
    },
    { 
        $group: { 
            _id: "$complaintKeywords", 
            count: { $sum: 1 } 
        } 
    },
    { $sort: { count: -1 } }, // Sort by count in decreasing order
    { $limit: 50 } 
]);

// business

const stopwords = [
    "my", "not", "flight", "were", "we", "they", "had", "have", "from", "me", 
    "no", "but", "our", "an", "as", "the", "to", "and", "of", "in", "on", "for", 
    "is", "it", "with", "at", "", "this", "that", "I", "was", "a","The","We", "be", "are","their","by","or","would","you","which","did","us","They",
    "Them", "them", "been","there","has", "My"
];

db.airlines_reviews.aggregate([
    { 
        $match: { 
            Verified: { $ne: "FALSE" }, 
            OverallRating: { $lte: 4 }, 
            TypeofTraveller: "Business" 
        } 
    },
    { 
        $project: { 
            complaintKeywords: { $split: ["$Reviews", " "] } 
        } 
    },
    { $unwind: "$complaintKeywords" }, // Flatten array of words
    { 
        $match: { 
            complaintKeywords: { $nin: stopwords } // Exclude irrelevant words
        } 
    },
    { 
        $group: { 
            _id: "$complaintKeywords", 
            count: { $sum: 1 } 
        } 
    },
    { $sort: { count: -1 } }, // Sort by count in decreasing order
    { $limit: 50 } 
]);

// couple 

const stopwords = [
    "my", "not", "flight", "were", "we", "they", "had", "have", "from", "me", 
    "no", "but", "our", "an", "as", "the", "to", "and", "of", "in", "on", "for", 
    "is", "it", "with", "at", "", "this", "that", "I", "was", "a","The","We", "be", "are","their","by","or","would","you","which","did","us","They",
    "Them", "them", "been","there","has", "My"
];

db.airlines_reviews.aggregate([
    { 
        $match: { 
            Verified: { $ne: "FALSE" }, 
            OverallRating: { $lte: 4 }, 
            TypeofTraveller: "Couple Leisure" 
        } 
    },
    { 
        $project: { 
            complaintKeywords: { $split: ["$Reviews", " "] } 
        } 
    },
    { $unwind: "$complaintKeywords" }, // Flatten array of words
    { 
        $match: { 
            complaintKeywords: { $nin: stopwords } // Exclude irrelevant words
        } 
    },
    { 
        $group: { 
            _id: "$complaintKeywords", 
            count: { $sum: 1 } 
        } 
    },
    { $sort: { count: -1 } }, // Sort by count in decreasing order
    { $limit: 50 } 
]);

// family   

const stopwords = [
    "my", "not", "flight", "were", "we", "they", "had", "have", "from", "me", 
    "no", "but", "our", "an", "as", "the", "to", "and", "of", "in", "on", "for", 
    "is", "it", "with", "at", "", "this", "that", "I", "was", "a","The","We", "be", "are","their","by","or","would","you","which","did","us","They",
    "Them", "them", "been","there","has", "My"
];

db.airlines_reviews.aggregate([
    { 
        $match: { 
            Verified: { $ne: "FALSE" }, 
            OverallRating: { $lte: 4 }, 
            TypeofTraveller: "Family Leisure" 
        } 
    },
    { 
        $project: { 
            complaintKeywords: { $split: ["$Reviews", " "] } 
        } 
    },
    { $unwind: "$complaintKeywords" }, // Flatten array of words
    { 
        $match: { 
            complaintKeywords: { $nin: stopwords } // Exclude irrelevant words
        } 
    },
    { 
        $group: { 
            _id: "$complaintKeywords", 
            count: { $sum: 1 } 
        } 
    },
    { $sort: { count: -1 } }, // Sort by count in decreasing order
    { $limit: 50 } 
]);


// Question 9

db.airlines_reviews.aggregate([
  {
    $addFields: {
      ReviewDateISO: { $dateFromString: { dateString: "$ReviewDate", format: "%d/%m/%Y" } }
    }
  },
  {
    $match: {
      Airline: "Singapore Airlines",
      Verified: "TRUE",
      ReviewDateISO: { $lt: new Date("2020-03-01") }
    }
  },
  {
    $group: {
      _id: "$Class",
      avg_seatcomfort: { $avg: "$SeatComfort" },
      avg_staffservice: { $avg: "$StaffService" },
      avg_foodnbeverages: { $avg: "$FoodnBeverages" },
      avg_inflightentertainment: { $avg: "$InflightEntertainment" },
      avg_valueformoney: { $avg: "$ValueForMoney" },
      avg_overallrating: { $avg: "$OverallRating" }
    }
  },
  {
    $addFields: {
      Period: "Pre-COVID"
    }
  },
  { $out: "pre_covid_aggregated" }
]);
  
db.airlines_reviews.aggregate([
  {
    $addFields: {
      ReviewDateISO: { $dateFromString: { dateString: "$ReviewDate", format: "%d/%m/%Y" } }
    }
  },
  {
    $match: {
      Airline: "Singapore Airlines",
      Verified: "TRUE",
      ReviewDateISO: { $gt: new Date("2020-03-01") }
    }
  },
  {
    $group: {
      _id: "$Class",
      avg_seatcomfort: { $avg: "$SeatComfort" },
      avg_staffservice: { $avg: "$StaffService" },
      avg_foodnbeverages: { $avg: "$FoodnBeverages" },
      avg_inflightentertainment: { $avg: "$InflightEntertainment" },
      avg_valueformoney: { $avg: "$ValueForMoney" },
      avg_overallrating: { $avg: "$OverallRating" }
    }
  },
  {
    $addFields: {
      Period: "Post-COVID"
    }
  },
  { $out: "post_covid_aggregated" }
]);

db.pre_covid_aggregated.find()
db.post_covid_aggregated.find()


db.airlines_reviews.aggregate([
  {
    $match: {
      OverallRating: { $lt: 5 },
      $or: [
        { Reviews: { $regex: /service/i } },
        { Reviews: { $regex: /delay/i } },
        { Reviews: { $regex: /cleanliness/i } },
        { Reviews: { $regex: /uncomfortable/i } },
        { Reviews: { $regex: /meal/i } },
        { Reviews: { $regex: /entertainment/i } },
        { Reviews: { $regex: /refund/i } }
      ]
    }
  },
  {
    $project: {
      ReviewDateISO: { $dateFromString: { dateString: "$ReviewDate", format: "%d/%m/%Y" } },
      keywords: {
        $filter: {
          input: [
            { keyword: "service", match: { $regexMatch: { input: { $toLower: "$Reviews" }, regex: /service/ } } },
            { keyword: "delay", match: { $regexMatch: { input: { $toLower: "$Reviews" }, regex: /delay/ } } },
            { keyword: "cleanliness", match: { $regexMatch: { input: { $toLower: "$Reviews" }, regex: /cleanliness/ } } },
            { keyword: "uncomfortable", match: { $regexMatch: { input: { $toLower: "$Reviews" }, regex: /uncomfortable/ } } },
            { keyword: "meal", match: { $regexMatch: { input: { $toLower: "$Reviews" }, regex: /meal/ } } },
            { keyword: "entertainment", match: { $regexMatch: { input: { $toLower: "$Reviews" }, regex: /entertainment/ } } },
            { keyword: "refund", match: { $regexMatch: { input: { $toLower: "$Reviews" }, regex: /refund/ } } }
          ],
          as: "item",
          cond: "$$item.match"
        }
      }
    }
  },
  {
    $unwind: "$keywords"
  },
  {
    $addFields: {
      pre_covid: {
        $cond: [{ $lt: ["$ReviewDateISO", new Date("2020-03-01")] }, 1, 0]
      },
      post_covid: {
        $cond: [{ $gte: ["$ReviewDateISO", new Date("2020-03-01")] }, 1, 0]
      }
    }
  },
  {
    $group: {
      _id: "$keywords.keyword",
      pre_covid: { $sum: "$pre_covid" },
      post_covid: { $sum: "$post_covid" }
    }
  },
  {
    $project: {
      keyword: "$_id",
      pre_covid: 1,
      post_covid: 1,
      _id: 0
    }
  }
]);


// Pre-COVID reviews count
db.airlines_reviews.aggregate([
  {
    $addFields: {
      ReviewDateISO: { $dateFromString: { dateString: "$ReviewDate", format: "%d/%m/%Y" } }
    }
  },
  {
    $match: {
      ReviewDateISO: { $lt: new Date("2020-03-01") }
    }
  },
  {
    $count: "NumberOfReviewsPreCOVID"
  }
]);

// Post-COVID reviews count
db.airlines_reviews.aggregate([
  {
    $addFields: {
      ReviewDateISO: { $dateFromString: { dateString: "$ReviewDate", format: "%d/%m/%Y" } }
    }
  },
  {
    $match: {
      ReviewDateISO: { $gt: new Date("2020-03-01") }
    }
  },
  {
    $count: "NumberOfReviewsPostCOVID"
  }
]);

// Question 10

db.customer_support.find({}) //showing all data in customer_support

db.customer_support.aggregate([ //finding common words
    {
        $project: {
            _id: 1,
            words: {
                $split: [
                    { $toLower: "$response" }, 
                    " "
                ]
            }
        }
    },
    {
        $unwind: "$words"
    },
    {
        $project: {
            word: {
                $trim: {  //filtering symbols
                    input: "$words",
                    chars: ".,!?-{}()[]\"'\\n"
                }
            }
        }
    },
    {
        $match: { 
            word: {
                $nin: [ //filtering common words
                    "and", "is", "a", "the", "it", "to", "of", "in", "with", "your", "or", "our", 
                    "you", "we", "this", "on", "for", "at", "are", "be", "as", "i", "if", "that",
                    "{{order", "number}}", "{{online", "company", "portal", "info}}", 
                    "{{customer", "support", "hours}}", "{{website", "url}}"
                ]
            }
        }
    },
    {
        $group: {
            _id: "$word",
            count: { $sum: 1 }
        }
    },
    {
        $sort: { count: -1 }
    }
]);

