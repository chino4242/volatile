import nfl_data_py as nfl
import pandas as pd
import matplotlib.pyplot as plt
from typing import List, Union

# --- Constants ---
# Using ALL_CAPS for constants is a standard Python convention.
QB_COLUMNS = [
    'player_display_name', 'recent_team', 'week', 'attempts', 'completions', 
    'passing_yards', 'passing_tds', 'interceptions', 'passing_air_yards', 'carries', 
    'rushing_yards', 'rushing_tds', 'fantasy_points_ppr'
]
SKILL_COLUMNS = [
    'player_display_name', 'recent_team', 'position', 'week', 'carries', 'rushing_yards', 
    'tds', 'targets', 'receptions', 'opportunities', 'receiving_yards', 'target_share', 
    'fantasy_points_ppr', 'opportunity_share' # Added new share metric
]
SKILL_COLUMNS_SEASON = [
    'player_display_name', 'position', 'games', 'cars/gm', 'rsh_yds/gm', 'tds', 
    'tgts/gm', 'recs/gm', 'opps/gm', 'rec_yds/gm', 'tgt_sh', 'ry_sh', 
    'fantasy_points_ppr', 'fantasy_points_ppr/gm', 'Value'
]
POSITIONS = {
    'SKILL': ['RB', 'WR', 'TE'],
    'ALL': ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
}


# --- Utility Functions ---

def cleanse_name(series: pd.Series) -> pd.Series:
    """
    Removes special characters and whitespace from a pandas Series of names.
    """
    return series.str.replace(r"[^\w\s]+", "", regex=True).str.strip()


# --- Data Creation Functions ---

def calculate_share_metrics(weekly_df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculates player share of team totals for key offensive metrics.

    Args:
        weekly_df: The main DataFrame containing weekly player stats.

    Returns:
        The DataFrame with new columns for share metrics (e.g., 'opportunity_share').
    """
    metrics_to_share = [
        'opportunities',
        'carries',
        'targets',
        'rushing_yards',
        'receiving_yards'
    ]

    # Use .transform('sum') to calculate the sum for each group (team/week)
    # and broadcast it back to every row in that group.
    for metric in metrics_to_share:
        team_total_col = f'team_{metric}'
        weekly_df[team_total_col] = weekly_df.groupby(
            ['recent_team', 'week']
        )[metric].transform('sum')

        # Calculate the share metric and fill NaN values with 0
        share_col = f'{metric}_share'
        weekly_df[share_col] = (
            weekly_df[metric] / weekly_df[team_total_col]
        ).fillna(0)

    # Clean up intermediate team total columns
    team_total_cols_to_drop = [f'team_{m}' for m in metrics_to_share]
    weekly_df.drop(columns=team_total_cols_to_drop, inplace=True)

    return weekly_df


def create_weekly_df(year: int) -> pd.DataFrame:
    """Imports and processes weekly NFL data for a given year."""
    weekly_df = nfl.import_weekly_data([year])
    
    # Feature Engineering
    weekly_df['opportunities'] = weekly_df['targets'].fillna(0) + weekly_df['carries'].fillna(0)
    weekly_df['tds'] = weekly_df['receiving_tds'].fillna(0) + weekly_df['rushing_tds'].fillna(0)
    weekly_df['is_skill_position'] = weekly_df['position'].isin(POSITIONS['SKILL'])
    
    # Cleaning
    weekly_df['player_cleansed_name'] = cleanse_name(weekly_df['player_display_name'])
    
    # --- Integrate the new share metrics function ---
    print("Calculating share metrics...")
    weekly_df = calculate_share_metrics(weekly_df)
    
    weekly_df.to_csv(f'weekly_{year}.csv', index=False)
    return weekly_df


def create_season_df(year: int, weekly_df: pd.DataFrame) -> pd.DataFrame:
    """Imports and processes seasonal NFL data."""
    season_df = nfl.import_seasonal_data([year])
    
    player_ref = weekly_df[['player_id', 'player_cleansed_name', 'position', 'recent_team']].drop_duplicates()
    season_df = season_df.merge(player_ref, on='player_id', how='left')

    season_df['tds'] = season_df['receiving_tds'] + season_df['rushing_tds']
    season_df['opportunities'] = season_df['targets'] + season_df['carries']
    
    for col in ['rushing_yards', 'targets', 'carries', 'receptions', 'receiving_yards', 'opportunities', 'fantasy_points_ppr']:
        season_df[f'{col}/gm'] = season_df[col] / season_df['games']
        
    season_df['is_skill_position'] = season_df['position'].isin(POSITIONS['SKILL'])
    
    return season_df


# --- Analysis and Plotting Functions ---

def display_team_stats(
    df: pd.DataFrame, 
    columns: List[str],
    group_by_col: str, 
    sort_by: str, 
    teams: Union[str, List[str]] = "all"
):
    """Displays stats for specified teams, grouped and sorted."""
    if teams == "all":
        teams_to_show = df[group_by_col].dropna().unique()
    else:
        teams_to_show = teams

    for team in teams_to_show:
        print(f"--- Team: {team} ---")
        team_df = df[df[group_by_col] == team]
        
        display_cols = [col for col in columns if col in team_df.columns]
        
        print(team_df[display_cols].sort_values(by=sort_by, ascending=False).to_string())
        print("\n")


def plot_weekly_metric(
    weekly_df: pd.DataFrame, 
    players_to_plot: List[str], 
    metric: str, 
    title: str = ""
):
    """A powerful function to plot weekly stats for a list of players."""
    data = weekly_df[weekly_df['player_cleansed_name'].isin(players_to_plot)]
    
    pivot_data = data.pivot_table(
        index='player_cleansed_name',
        columns='week',
        values=metric,
        aggfunc='sum'
    ).fillna(0)
    
    plt.style.use('seaborn-v0_8-whitegrid')
    fig, ax = plt.subplots(figsize=(12, 7))

    for player, weekly_data in pivot_data.iterrows():
        ax.plot(weekly_data.index, weekly_data.values, marker='o', linestyle='-', label=player)

    ax.set_xlabel("Week")
    ax.set_ylabel(metric.replace('_', ' ').title())
    ax.set_title(title if title else f"Weekly {metric.replace('_', ' ').title()} for Selected Players")
    ax.set_xticks(range(1, weekly_df['week'].max() + 1))
    ax.legend()
    plt.tight_layout()
    plt.show()


# --- Main Execution Block ---

def main():
    """Main function to run the data analysis script."""
    YEAR = 2023 # Use a constant for the year for easy updates
    
    print(f"Creating weekly data for {YEAR}...")
    weekly = create_weekly_df(YEAR)
    
    print(f"Creating seasonal data for {YEAR}...")
    season = create_season_df(YEAR, weekly)
    
    # --- Example Usage ---
    
    # 1. Show season-long stats for skill players on a few teams
    print("Displaying season stats for skill players on TB and ATL...")
    skill_season_df = season[season['is_skill_position']].copy()
    display_team_stats(
        df=skill_season_df,
        columns=SKILL_COLUMNS_SEASON,
        group_by_col='recent_team',
        sort_by='fantasy_points_ppr/gm',
        teams=['TB', 'ATL']
    )
    
    # 2. Plot weekly opportunities and opportunity SHARE for top Chiefs players
    chiefs_players = ['Isiah Pacheco', 'Travis Kelce', 'Rashee Rice']
    plot_weekly_metric(
        weekly_df=weekly,
        players_to_plot=chiefs_players,
        metric='opportunities',
        title=f'KC Skill Player Weekly Opportunities ({YEAR})'
    )
    
    # 3. USE THE NEW METRIC! Plot opportunity share.
    plot_weekly_metric(
        weekly_df=weekly,
        players_to_plot=chiefs_players,
        metric='opportunity_share',
        title=f'KC Skill Player Weekly Opportunity Share ({YEAR})'
    )


if __name__ == "__main__":
    main()
