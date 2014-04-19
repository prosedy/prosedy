class ArticlesController < ApplicationController
  def new
  end

  def create
    #render nothing: true
    render plain: params[:article].inspect
  end
end
