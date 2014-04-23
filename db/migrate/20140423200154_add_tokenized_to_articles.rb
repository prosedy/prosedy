class AddTokenizedToArticles < ActiveRecord::Migration
  def change
    add_column :articles, :tokenized, :text
  end
end
