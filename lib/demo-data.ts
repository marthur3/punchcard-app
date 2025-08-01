export const demoBusinesses = [
  {
    id: "1",
    name: "Coffee Corner",
    description: "Your neighborhood coffee shop",
    nfc_tag_id: "nfc_coffee_001",
    max_punches: 10,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Pizza Palace",
    description: "Authentic Italian pizza",
    nfc_tag_id: "nfc_pizza_001",
    max_punches: 8,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "3",
    name: "Burger Barn",
    description: "Gourmet burgers and fries",
    nfc_tag_id: "nfc_burger_001",
    max_punches: 12,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
]

export const demoUsers = [
  {
    id: "user-1",
    email: "demo@example.com",
    name: "Demo User",
    phone: "+1555123456",
    created_at: "2024-01-01T00:00:00Z",
    leaderboard_opted_in: true,
    display_name: "Demo User",
  },
  {
    id: "user-2",
    email: "john@example.com",
    name: "John Doe",
    phone: "+1234567890",
    created_at: "2024-01-01T00:00:00Z",
    leaderboard_opted_in: true,
    display_name: "Coffee King John",
  },
  {
    id: "user-3",
    email: "jane@example.com",
    name: "Jane Smith",
    phone: "+1234567891",
    created_at: "2024-01-01T00:00:00Z",
    leaderboard_opted_in: true,
    display_name: "Pizza Lover Jane",
  },
  {
    id: "user-4",
    email: "mike@example.com",
    name: "Mike Chen",
    phone: "+1234567892",
    created_at: "2024-01-01T00:00:00Z",
    leaderboard_opted_in: true,
    display_name: "Burger Mike",
  },
  {
    id: "user-5",
    email: "sarah@example.com",
    name: "Sarah Wilson",
    phone: "+1234567893",
    created_at: "2024-01-01T00:00:00Z",
    leaderboard_opted_in: true,
    display_name: "Caffeine Queen",
  },
  {
    id: "user-6",
    email: "alex@example.com",
    name: "Alex Rodriguez",
    phone: "+1234567894",
    created_at: "2024-01-01T00:00:00Z",
    leaderboard_opted_in: false,
    display_name: "Alex R.",
  },
]

export const demoPrizes = [
  {
    id: "prize-1",
    business_id: "1",
    name: "Free Coffee",
    description: "Get any coffee drink on the house",
    punches_required: 5,
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "prize-2",
    business_id: "1",
    name: "Free Coffee for a Week",
    description: "One free coffee every day for a week",
    punches_required: 10,
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "prize-3",
    business_id: "2",
    name: "Free Pizza Slice",
    description: "Choose any pizza slice for free",
    punches_required: 4,
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "prize-4",
    business_id: "2",
    name: "Free Large Pizza",
    description: "Any large pizza with up to 3 toppings",
    punches_required: 8,
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "prize-5",
    business_id: "3",
    name: "Free Burger",
    description: "Free classic burger with fries",
    punches_required: 6,
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "prize-6",
    business_id: "3",
    name: "Free Meal Combo",
    description: "Burger, fries, and drink combo",
    punches_required: 12,
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
  },
]

export const demoPunchCards = [
  {
    id: "card-1",
    user_id: "user-1",
    business_id: "1",
    current_punches: 3,
    total_punches: 8,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z",
    business: demoBusinesses[0],
  },
  {
    id: "card-2",
    user_id: "user-1",
    business_id: "2",
    current_punches: 2,
    total_punches: 5,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-10T00:00:00Z",
    business: demoBusinesses[1],
  },
  {
    id: "card-3",
    user_id: "user-1",
    business_id: "3",
    current_punches: 1,
    total_punches: 3,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-05T00:00:00Z",
    business: demoBusinesses[2],
  },
  // John Doe - Coffee enthusiast
  {
    id: "card-4",
    user_id: "user-2",
    business_id: "1",
    current_punches: 7,
    total_punches: 23,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-20T00:00:00Z",
    business: demoBusinesses[0],
  },
  {
    id: "card-5",
    user_id: "user-2",
    business_id: "2",
    current_punches: 3,
    total_punches: 7,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-18T00:00:00Z",
    business: demoBusinesses[1],
  },
  // Jane Smith - Pizza lover  
  {
    id: "card-6",
    user_id: "user-3",
    business_id: "2",
    current_punches: 5,
    total_punches: 18,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-19T00:00:00Z",
    business: demoBusinesses[1],
  },
  {
    id: "card-7",
    user_id: "user-3",
    business_id: "1",
    current_punches: 2,
    total_punches: 12,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-17T00:00:00Z",
    business: demoBusinesses[0],
  },
  // Mike Chen - Burger enthusiast
  {
    id: "card-8",
    user_id: "user-4",
    business_id: "3",
    current_punches: 8,
    total_punches: 15,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-21T00:00:00Z",
    business: demoBusinesses[2],
  },
  {
    id: "card-9",
    user_id: "user-4",
    business_id: "1",
    current_punches: 1,
    total_punches: 4,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-12T00:00:00Z",
    business: demoBusinesses[0],
  },
  // Sarah Wilson - Ultimate coffee queen
  {
    id: "card-10",
    user_id: "user-5",
    business_id: "1",
    current_punches: 9,
    total_punches: 31,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-22T00:00:00Z",
    business: demoBusinesses[0],
  },
  {
    id: "card-11",
    user_id: "user-5",
    business_id: "2",
    current_punches: 4,
    total_punches: 11,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-16T00:00:00Z",
    business: demoBusinesses[1],
  },
  {
    id: "card-12",
    user_id: "user-5",
    business_id: "3",
    current_punches: 2,
    total_punches: 8,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-14T00:00:00Z",
    business: demoBusinesses[2],
  },
]

export const demoPunches = [
  {
    id: "punch-1",
    punch_card_id: "card-1",
    user_id: "user-1",
    business_id: "1",
    location_data: { demo: true, location: "Coffee Corner Downtown" },
    created_at: "2024-01-15T10:30:00Z",
    business: { name: "Coffee Corner" },
  },
  {
    id: "punch-2",
    punch_card_id: "card-1",
    user_id: "user-1",
    business_id: "1",
    location_data: { demo: true, location: "Coffee Corner Downtown" },
    created_at: "2024-01-14T09:15:00Z",
    business: { name: "Coffee Corner" },
  },
  {
    id: "punch-3",
    punch_card_id: "card-2",
    user_id: "user-1",
    business_id: "2",
    location_data: { demo: true, location: "Pizza Palace Mall" },
    created_at: "2024-01-10T18:45:00Z",
    business: { name: "Pizza Palace" },
  },
]

// Leaderboard data structures and utilities
export interface LeaderboardEntry {
  user_id: string
  display_name: string
  total_punches: number
  businesses_visited: number
  current_streak: number
  last_visit: string
  rank: number
  badge?: string
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
}

export const generateLeaderboardData = (): LeaderboardEntry[] => {
  const leaderboard: LeaderboardEntry[] = []
  
  demoUsers.forEach(user => {
    if (!user.leaderboard_opted_in) return
    
    const userCards = demoPunchCards.filter(card => card.user_id === user.id)
    const totalPunches = userCards.reduce((sum, card) => sum + card.total_punches, 0)
    const businessesVisited = userCards.length
    
    // Calculate tier based on total punches
    let tier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze'
    let badge = ''
    
    if (totalPunches >= 50) {
      tier = 'platinum'
      badge = '👑'
    } else if (totalPunches >= 30) {
      tier = 'gold'
      badge = '🏆'
    } else if (totalPunches >= 15) {
      tier = 'silver'
      badge = '🥈'
    } else if (totalPunches >= 5) {
      tier = 'bronze'
      badge = '🥉'
    }
    
    leaderboard.push({
      user_id: user.id,
      display_name: user.display_name,
      total_punches: totalPunches,
      businesses_visited: businessesVisited,
      current_streak: Math.floor(Math.random() * 7) + 1, // Demo streak data
      last_visit: userCards.reduce((latest, card) => 
        card.updated_at > latest ? card.updated_at : latest, 
        '2024-01-01T00:00:00Z'
      ),
      rank: 0, // Will be set after sorting
      badge,
      tier
    })
  })
  
  // Sort by total punches and assign ranks
  leaderboard.sort((a, b) => b.total_punches - a.total_punches)
  leaderboard.forEach((entry, index) => {
    entry.rank = index + 1
  })
  
  return leaderboard
}

export const getBusinessLeaderboard = (businessId: string): LeaderboardEntry[] => {
  const leaderboard: LeaderboardEntry[] = []
  
  demoUsers.forEach(user => {
    if (!user.leaderboard_opted_in) return
    
    const userCard = demoPunchCards.find(card => 
      card.user_id === user.id && card.business_id === businessId
    )
    
    if (!userCard) return
    
    // Calculate tier based on punches at this business
    let tier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze'
    let badge = ''
    
    if (userCard.total_punches >= 25) {
      tier = 'platinum'
      badge = '👑'
    } else if (userCard.total_punches >= 15) {
      tier = 'gold'
      badge = '🏆'
    } else if (userCard.total_punches >= 8) {
      tier = 'silver'
      badge = '🥈'
    } else if (userCard.total_punches >= 3) {
      tier = 'bronze'
      badge = '🥉'
    }
    
    leaderboard.push({
      user_id: user.id,
      display_name: user.display_name,
      total_punches: userCard.total_punches,
      businesses_visited: 1, // Just this business
      current_streak: Math.floor(Math.random() * 7) + 1,
      last_visit: userCard.updated_at,
      rank: 0,
      badge,
      tier
    })
  })
  
  // Sort by total punches at this business and assign ranks
  leaderboard.sort((a, b) => b.total_punches - a.total_punches)
  leaderboard.forEach((entry, index) => {
    entry.rank = index + 1
  })
  
  return leaderboard
}
